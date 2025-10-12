from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError
import models
import os
from datetime import datetime, timedelta

# データベースURL（環境変数から取得、デフォルトはSQLite）
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./uriv.db")

# SQLAlchemyエンジンの作成
# SQLiteの場合はcheck_same_threadをFalseに設定
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

# セッションファクトリの作成
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Session:
    """データベースセッションを取得する依存関数"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_user_by_email(db: Session, email: str):
    """メールアドレスでユーザーを取得"""
    return db.query(models.User).filter(models.User.email == email).first()

def save_verification_code(db: Session, email: str, code: str):
    """認証コードを保存"""
    user = get_user_by_email(db, email)
    
    # メールアドレスから大学ドメインを抽出
    domain = email.split("@")[-1] if "@" in email else ""
    
    if user:
        user.verification_code = code
        user.updated_at = models.jst_now()
        # 大学情報が未設定の場合は設定
        if not user.university and domain:
            user.university = domain
    else:
        # 新規ユーザーを作成
        new_user = models.User(
            email=email,
            verification_code=code,
            is_verified=False,
            university=domain
        )
        db.add(new_user)
    db.commit()

def get_verification_code(db: Session, email: str) -> str:
    """認証コードを取得"""
    user = get_user_by_email(db, email)
    if user and user.verification_code:
        # 5分以内のコードのみ有効
        if user.updated_at and models.jst_now() - user.updated_at < timedelta(minutes=5):
            return user.verification_code
    return None

def mark_user_as_verified(db: Session, email: str):
    """ユーザーを認証済みにマーク"""
    user = get_user_by_email(db, email)
    if user:
        user.is_verified = True
        user.verification_code = None
        user.updated_at = models.jst_now()
        db.commit()
