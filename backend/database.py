from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError
import models
import os
from datetime import datetime, timedelta

# データベースURL（環境変数から取得、デフォルトはPostgreSQL）
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://uriv_user:uriv_password@db:5432/uriv_db")

# SQLAlchemyエンジンの作成
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
    if user:
        user.verification_code = code
        user.updated_at = datetime.utcnow()
    else:
        # 新規ユーザーを作成
        new_user = models.User(
            email=email,
            verification_code=code,
            is_verified=False
        )
        db.add(new_user)
    db.commit()

def get_verification_code(db: Session, email: str) -> str:
    """認証コードを取得"""
    user = get_user_by_email(db, email)
    if user and user.verification_code:
        # 5分以内のコードのみ有効
        if user.updated_at and datetime.utcnow() - user.updated_at < timedelta(minutes=5):
            return user.verification_code
    return None

def mark_user_as_verified(db: Session, email: str):
    """ユーザーを認証済みにマーク"""
    user = get_user_by_email(db, email)
    if user:
        user.is_verified = True
        user.verification_code = None
        user.updated_at = datetime.utcnow()
        db.commit()
