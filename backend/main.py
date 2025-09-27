from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models, schemas, database, utils, univ_domains
import market_routes
import os

app = FastAPI()

# データベーステーブルを作成（起動時に実行）
@app.on_event("startup")
async def startup_event():
    try:
        models.Base.metadata.create_all(bind=database.engine)
        print("データベーステーブルが正常に作成されました")
    except Exception as e:
        print(f"データベース接続エラー: {e}")
        # データベースが起動していない場合は待機
        import time
        time.sleep(5)
        models.Base.metadata.create_all(bind=database.engine)

# CORS設定（開発用：全許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://frontend:3000"  # Docker環境用
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# DBセッションを取得する依存関数
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

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