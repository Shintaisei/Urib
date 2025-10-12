from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models, schemas, database, utils, univ_domains
import market_routes
import board_routes
import os

app = FastAPI()

# データベーステーブルを作成（起動時に実行）
@app.on_event("startup")
async def startup_event():
    try:
        models.Base.metadata.create_all(bind=database.engine)
        print("データベーステーブルが正常に作成されました")
        
        # デモユーザーを作成（開発モード用）
        db = database.SessionLocal()
        try:
            import random
            import string
            demo_email = "demo@hokudai.ac.jp"
            existing_user = database.get_user_by_email(db, demo_email)
            if not existing_user:
                # 匿名名を生成
                anonymous_name = f"匿名ユーザー #{''.join(random.choices(string.ascii_uppercase + string.digits, k=4))}"
                demo_user = models.User(
                    email=demo_email,
                    university="hokudai.ac.jp",
                    anonymous_name=anonymous_name,
                    is_verified=True
                )
                db.add(demo_user)
                db.commit()
                print(f"デモユーザーを作成しました: {demo_email} ({anonymous_name})")
            else:
                # 既存のデモユーザーに匿名名がない場合は追加
                if not existing_user.anonymous_name:
                    anonymous_name = f"匿名ユーザー #{''.join(random.choices(string.ascii_uppercase + string.digits, k=4))}"
                    existing_user.anonymous_name = anonymous_name
                    db.commit()
                    print(f"デモユーザーに匿名名を追加しました: {demo_email} ({anonymous_name})")
                else:
                    print(f"デモユーザーは既に存在します: {demo_email} ({existing_user.anonymous_name})")
        finally:
            db.close()
            
    except Exception as e:
        print(f"データベース接続エラー: {e}")
        # データベースが起動していない場合は待機
        import time
        time.sleep(5)
        models.Base.metadata.create_all(bind=database.engine)

# CORS設定（環境変数で制御）
ENV = os.getenv("ENV", "development")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",")

if ENV == "production":
    # 本番環境：環境変数で指定されたオリジンのみ許可
    origins = [origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()]
    print(f"✅ 本番環境モード - 許可されたオリジン: {origins}")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # 開発環境：全てのオリジンを許可
    print("✅ 開発環境モード - 全てのオリジンを許可")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# DBセッションを取得する依存関数
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# メールアドレスチェックAPI
@app.get("/users/check-email")
def check_email(email: str, db: Session = Depends(get_db)):
    """メールアドレスで既存ユーザーをチェック"""
    normalized_email = email.strip().lower()
    existing_user = database.get_user_by_email(db, normalized_email)
    
    if existing_user:
        return {
            "exists": True,
            "user": {
                "id": existing_user.id,
                "email": existing_user.email,
                "anonymous_name": existing_user.anonymous_name,
                "university": existing_user.university,
                "year": existing_user.year,
                "department": existing_user.department
            }
        }
    else:
        return {"exists": False}

# 簡易ユーザー登録API（認証なし）
@app.post("/users/quick-register", response_model=schemas.UserRegisterResponse)
def quick_register(user: schemas.UserQuickRegister, db: Session = Depends(get_db)):
    """簡易ユーザー登録（ニックネーム・学年・学部・大学・メールアドレス）"""
    
    # ニックネームのバリデーション
    nickname = user.nickname.strip()
    if len(nickname) < 2:
        raise HTTPException(status_code=400, detail="ニックネームは2文字以上で入力してください")
    if len(nickname) > 20:
        raise HTTPException(status_code=400, detail="ニックネームは20文字以内で入力してください")
    
    # メールアドレスの処理
    email_to_save = None
    if user.email:
        email_to_save = user.email.strip().lower()
        # メールアドレスの重複チェック
        existing_user = database.get_user_by_email(db, email_to_save)
        if existing_user:
            raise HTTPException(status_code=400, detail="このメールアドレスは既に登録されています")
    
    # ニックネームの重複チェック（任意）
    existing_user = db.query(models.User).filter(models.User.anonymous_name == nickname).first()
    if existing_user:
        # 重複している場合は番号を追加
        import random
        nickname = f"{nickname}{random.randint(1, 999)}"
    
    # 新規ユーザーを作成
    new_user = models.User(
        email=email_to_save,
        university=user.university,
        year=user.year,
        department=user.department,
        anonymous_name=nickname,  # ユーザーが入力したニックネームを使用
        is_verified=True if email_to_save else False
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return schemas.UserRegisterResponse(
        user_id=new_user.id,
        anonymous_name=new_user.anonymous_name,
        university=new_user.university,
        year=new_user.year,
        department=new_user.department
    )

# 認証コード送信API
@app.post("/auth/request")
def request_auth(user: schemas.UserCreate, db: Session = Depends(get_db)):
    normalized_email = user.email.strip().lower()
    if not univ_domains.is_university_email(normalized_email):
        raise HTTPException(status_code=400, detail="大学メールアドレスを使用してください。")

    # 既に認証済みならワンタイムコード不要で即ログイン可
    existing = database.get_user_by_email(db, normalized_email)
    if existing and existing.is_verified:
        print(f"【開発用】既認証ユーザー: {normalized_email} (user_id={existing.id})")
        return {
            "message": "既に認証済みです",
            "verified": True,
            "user_id": existing.id,
            "university": existing.university,
        }

    code = utils.generate_code()
    database.save_verification_code(db, normalized_email, code)

    # メール送信を試行
    email_sent = utils.send_verification_email(normalized_email, code)
    env = os.getenv("ENV", "development").lower()

    # 開発環境のみ、認証コードをログ・レスポンスに出す
    if env == "development":
        if not email_sent:
            print(f"【開発用】認証コード: {code} (メールアドレス: {normalized_email})")
            return {
                "message": "認証コードを送信しました（開発モード）",
                "dev_code": code,
                "verified": False,
            }
        return {"message": "認証コードを送信しました", "verified": False}

    # 本番は dev_code を絶対に返さない
    if not email_sent:
        # 本番では失敗を明確に返す（フロントでエラーメッセージ表示）
        raise HTTPException(status_code=500, detail="メール送信に失敗しました。しばらくしてからお試しください。")

    return {"message": "認証コードを送信しました", "verified": False}

# 認証コード検証API
@app.post("/auth/verify")
def verify_auth(user: schemas.UserVerify, db: Session = Depends(get_db)):
    # メールアドレスを正規化（requestと同じ処理）
    normalized_email = user.email.strip().lower()
    
    saved_code = database.get_verification_code(db, normalized_email)
    if not saved_code or saved_code != user.code:
        raise HTTPException(status_code=400, detail="認証コードが正しくありません。")
    
    # ユーザーを認証済みにマーク
    database.mark_user_as_verified(db, normalized_email)
    current = database.get_user_by_email(db, normalized_email)

    return {
        "message": "認証が完了しました",
        "access_token": "authenticated",
        "token_type": "bearer",
        "user_id": current.id if current else None,
        "university": current.university if current else None,
        "verified": True,
    }

# 市場掲示板のルーターを追加
app.include_router(market_routes.router)

# 掲示板のルーターを追加
app.include_router(board_routes.router)