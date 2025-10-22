from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models, schemas, database, utils, univ_domains
import market_routes
import dm_routes
import board_routes
import analytics_routes
import os
import re
from typing import Optional

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
ALLOWED_ORIGINS_ENV = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGIN_REGEX_ENV = os.getenv("ALLOWED_ORIGIN_REGEX", "")

if ENV == "production":
    # 本番環境：環境変数で指定されたオリジンのみ許可
    if ALLOWED_ORIGINS_ENV:
        origins = [origin.strip() for origin in ALLOWED_ORIGINS_ENV.split(",") if origin.strip()]
    else:
        # フォールバック：環境変数が未設定の場合
        origins = ["https://urib.vercel.app"]
        print("⚠️  ALLOWED_ORIGINS環境変数が未設定です。デフォルト値を使用します。")
    
    print(f"✅ 本番環境モード - 許可されたオリジン: {origins}")
    # vercelプレビューも許可するための正規表現（必要に応じて環境変数で上書き可能）
    origin_regex = ALLOWED_ORIGIN_REGEX_ENV or r"https://.*\\.vercel\\.app"
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=origin_regex,
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

# ユーザー検索（メンション補助）
@app.get("/users/search")
def search_users(name_prefix: str = "", limit: int = 10, db: Session = Depends(get_db)):
    """匿名表示名の前方一致検索。最大10件まで。"""
    name_prefix = (name_prefix or "").strip()
    q = db.query(models.User)
    if name_prefix:
        q = q.filter(models.User.anonymous_name.like(f"{name_prefix}%"))
    rows = q.order_by(models.User.anonymous_name.asc()).limit(max(1, min(limit, 20))).all()
    return [
        {
            "id": u.id,
            "anonymous_name": u.anonymous_name,
            "email": u.email,
        }
        for u in rows
    ]

# 匿名名からユーザーを解決（公開情報のみ）
@app.get("/users/resolve")
def resolve_user(anonymous_name: str, db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.anonymous_name == anonymous_name).first()
    if not u:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    return {
        "id": u.id,
        "anonymous_name": u.anonymous_name,
        "university": u.university,
        "year": u.year,
        "department": u.department,
        # emailは原則返さない
    }

# ユーザーIDで公開情報を取得
@app.get("/users/public/{user_id}")
def get_user_public(user_id: int, db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    return {
        "id": u.id,
        "anonymous_name": u.anonymous_name,
        "university": u.university,
        "year": u.year,
        "department": u.department,
    }

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

# アナリティクスのルーターを追加
app.include_router(analytics_routes.router)

# DMのルーターを追加
app.include_router(dm_routes.router)

# =========================
# 管理者専用: アカウント削除
# =========================

ADMIN_EMAIL_PATTERN = re.compile(r"^(master|mster)(00|0?[1-9]|[1-2][0-9]|30)@(?:[\w.-]+\.)?ac\.jp$", re.IGNORECASE)

def is_admin_email(email: Optional[str]) -> bool:
    if not email:
        return False
    return ADMIN_EMAIL_PATTERN.match(email or "") is not None

def resolve_email_from_headers(request: Request, db: Session) -> Optional[str]:
    dev_email = request.headers.get("X-Dev-Email")
    if dev_email:
        return (dev_email or "").strip().lower()
    user_id = request.headers.get("X-User-Id")
    if user_id:
        try:
            uid = int(user_id)
        except Exception:
            uid = None
        if uid:
            user = db.query(models.User).filter(models.User.id == uid).first()
            if user and user.email:
                return (user.email or "").strip().lower()
    return None

def resolve_user_from_headers(request: Request, db: Session) -> Optional[models.User]:
    user_id = request.headers.get("X-User-Id")
    if user_id:
        try:
            uid = int(user_id)
        except Exception:
            uid = None
        if uid:
            user = db.query(models.User).filter(models.User.id == uid).first()
            if user:
                return user
    # Fallback: email
    email = resolve_email_from_headers(request, db)
    if email:
        return database.get_user_by_email(db, email)
    return None

def delete_user_deep(db: Session, target: models.User):
    """参照整合性エラーを避けるため、ユーザー関連データを順に削除"""
    uid = target.id
    # いいね類
    db.query(models.BoardReplyLike).filter(models.BoardReplyLike.user_id == uid).delete(synchronize_session=False)
    db.query(models.BoardPostLike).filter(models.BoardPostLike.user_id == uid).delete(synchronize_session=False)
    db.query(models.MarketItemLike).filter(models.MarketItemLike.user_id == uid).delete(synchronize_session=False)
    if hasattr(models, 'MarketItemCommentLike'):
        db.query(models.MarketItemCommentLike).filter(models.MarketItemCommentLike.user_id == uid).delete(synchronize_session=False)
    # 通知（受信者/行為者）
    db.query(models.Notification).filter(models.Notification.user_id == uid).delete(synchronize_session=False)
    db.query(models.Notification).filter(models.Notification.actor_id == uid).delete(synchronize_session=False)
    # コメント/返信
    if hasattr(models, 'MarketItemComment'):
        db.query(models.MarketItemComment).filter(models.MarketItemComment.author_id == uid).delete(synchronize_session=False)
    db.query(models.BoardReply).filter(models.BoardReply.author_id == uid).delete(synchronize_session=False)
    # 投稿/出品
    db.query(models.BoardPost).filter(models.BoardPost.author_id == uid).delete(synchronize_session=False)
    db.query(models.MarketItem).filter(models.MarketItem.author_id == uid).delete(synchronize_session=False)
    # アナリティクス
    db.query(models.PageView).filter(models.PageView.user_id == uid).delete(synchronize_session=False)
    if hasattr(models, 'AnalyticsEvent'):
        db.query(models.AnalyticsEvent).filter(models.AnalyticsEvent.user_id == uid).delete(synchronize_session=False)
    # 最後にユーザー
    db.delete(target)

@app.delete("/users/me")
def delete_my_account(request: Request, db: Session = Depends(get_db)):
    """管理者専用: 自分のアカウントを削除"""
    email = resolve_email_from_headers(request, db)
    if not is_admin_email(email):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="管理者のみが実行できます")

    current = resolve_user_from_headers(request, db)
    if not current:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ユーザーが見つかりません")

    delete_user_deep(db, current)
    db.commit()
    return {"message": "アカウントを削除しました", "user_id": current.id}

@app.delete("/admin/users/{user_id}")
def admin_delete_user(user_id: int, request: Request, db: Session = Depends(get_db)):
    """管理者専用: 任意のユーザーを削除"""
    email = resolve_email_from_headers(request, db)
    if not is_admin_email(email):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="管理者のみが実行できます")

    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ユーザーが見つかりません")
    delete_user_deep(db, target)
    db.commit()
    return {"message": "ユーザーを削除しました", "user_id": user_id}