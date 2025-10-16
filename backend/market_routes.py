from fastapi import APIRouter, Depends, HTTPException, status, Request, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc, func
from typing import List, Optional
from datetime import datetime
import re
import json
import models, schemas, database, utils
import random
import string

router = APIRouter(prefix="/market", tags=["market"])

def get_current_user_email(request: Request):
    """現在のユーザーのemailを取得（JWTトークン or 開発用フォールバック）"""
    # 本番環境ではJWTトークンから取得
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        try:
            from auth import verify_token
            email = verify_token(token)
            if email:
                return email
        except Exception:
            pass  # トークン検証失敗時はフォールバック
    
    # X-User-Id から取得（存在すれば優先）
    user_id = request.headers.get("X-User-Id")
    if user_id:
        try:
            uid = int(user_id)
            db = database.SessionLocal()
            try:
                user = db.query(models.User).filter(models.User.id == uid).first()
                if user and user.email:
                    return user.email
            finally:
                db.close()
        except Exception:
            pass

    # 開発用フォールバック: X-Dev-Email ヘッダー
    dev_email = request.headers.get("X-Dev-Email")
    if dev_email:
        if dev_email.startswith("dev:"):
            dev_email = dev_email[4:]
        return dev_email
    
    # 開発環境ではテストユーザーを使用
    test_users = [
        "test1@hokudai.ac.jp",
        "test2@u-tokyo.ac.jp", 
        "test3@kyoto-u.ac.jp"
    ]
    return random.choice(test_users)

def get_user_by_email(db: Session, email: str):
    """emailでユーザーを取得"""
    return db.query(models.User).filter(models.User.email == email).first()

def generate_anonymous_name():
    """匿名表示名を生成（例: 匿名ユーザー #A1B2）"""
    return f"匿名ユーザー #{''.join(random.choices(string.ascii_uppercase + string.digits, k=4))}"

def get_or_create_anonymous_name(user, db: Session):
    """ユーザーの固定匿名名を取得または生成"""
    if not user.anonymous_name:
        # 匿名名が未設定の場合は生成して保存
        user.anonymous_name = generate_anonymous_name()
        db.commit()
        db.refresh(user)
    return user.anonymous_name

# 管理者判定（master/mster 00,01-09,1-30）
ADMIN_EMAIL_PATTERN = re.compile(r"^(master|mster)(00|0?[1-9]|[1-2][0-9]|30)@(?:[\w.-]+\.)?ac\.jp$", re.IGNORECASE)

def require_admin(request: Request):
    email = get_current_user_email(request)
    if not (email and ADMIN_EMAIL_PATTERN.match(email.strip().lower())):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="管理者のみが実行できます")
    return email

@router.get("/items", response_model=List[schemas.MarketItemResponse])
def get_market_items(
    request: Request,
    type: Optional[str] = Query(None, description="商品タイプ (buy, sell, free)"),
    category: Optional[str] = Query(None, description="カテゴリ"),
    min_price: Optional[int] = Query(None, description="最低価格"),
    max_price: Optional[int] = Query(None, description="最高価格"),
    condition: Optional[str] = Query(None, description="商品状態"),
    university: Optional[str] = Query(None, description="大学名"),
    search: Optional[str] = Query(None, description="検索クエリ"),
    limit: int = Query(20, description="取得件数"),
    offset: int = Query(0, description="オフセット"),
    db: Session = Depends(database.get_db)
):
    """市場商品一覧を取得"""
    
    # クエリを構築
    query = db.query(models.MarketItem).filter(models.MarketItem.is_available == True)
    
    # フィルター適用
    if type:
        query = query.filter(models.MarketItem.type == type)
    if category:
        query = query.filter(models.MarketItem.category == category)
    if min_price is not None:
        query = query.filter(models.MarketItem.price >= min_price)
    if max_price is not None:
        query = query.filter(models.MarketItem.price <= max_price)
    if condition:
        query = query.filter(models.MarketItem.condition == condition)
    if university:
        query = query.filter(models.MarketItem.author.has(models.User.university == university))
    if search:
        query = query.filter(
            or_(
                models.MarketItem.title.contains(search),
                models.MarketItem.description.contains(search),
                models.MarketItem.category.contains(search)
            )
        )
    
    # 並び順とページネーション
    items = query.order_by(desc(models.MarketItem.created_at)).offset(offset).limit(limit).all()
    
    # レスポンス形式に変換
    result = []
    for item in items:
        # 画像をJSONから配列に変換
        images = []
        if item.images:
            try:
                images = json.loads(item.images)
            except:
                images = []
        
        result.append(schemas.MarketItemResponse(
            id=str(item.id),
            title=item.title,
            description=item.description,
            type=item.type,
            price=item.price,
            condition=item.condition,
            category=item.category,
            images=images,
            author_name=item.author_name,
            university=item.author.university or "不明",
            contact_method=item.contact_method,
            is_available=item.is_available,
            created_at=item.created_at.isoformat(),
            updated_at=item.updated_at.isoformat(),
            view_count=item.view_count,
            like_count=item.like_count,
            is_liked=False  # TODO: 現在のユーザーのいいね状態を確認
        ))
    
    return result

@router.get("/items/{item_id}", response_model=schemas.MarketItemResponse)
def get_market_item(
    item_id: int,
    request: Request,
    db: Session = Depends(database.get_db)
):
    """特定の市場商品を取得"""
    
    item = db.query(models.MarketItem).filter(models.MarketItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="商品が見つかりません"
        )
    
    # 閲覧数を増加
    item.view_count += 1
    db.commit()
    
    # 画像をJSONから配列に変換
    images = []
    if item.images:
        try:
            images = json.loads(item.images)
        except:
            images = []
    
    return schemas.MarketItemResponse(
        id=str(item.id),
        title=item.title,
        description=item.description,
        type=item.type,
        price=item.price,
        condition=item.condition,
        category=item.category,
        images=images,
        author_name=item.author_name,
        university=item.author.university or "不明",
        contact_method=item.contact_method,
        is_available=item.is_available,
        created_at=item.created_at.isoformat(),
        updated_at=item.updated_at.isoformat(),
        view_count=item.view_count,
        like_count=item.like_count,
        is_liked=False  # TODO: 現在のユーザーのいいね状態を確認
    )

@router.post("/items", response_model=schemas.MarketItemResponse)
def create_market_item(
    item_data: schemas.MarketItemCreate,
    request: Request,
    db: Session = Depends(database.get_db)
):
    """新しい市場商品を作成"""
    
    # 現在のユーザーを取得
    current_user_email = get_current_user_email(request)
    current_user = get_user_by_email(db, current_user_email)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません"
        )
    
    # ユーザーの固定匿名名を取得または生成
    anonymous_name = get_or_create_anonymous_name(current_user, db)
    
    # 画像は最大3枚 + 簡易バリデーション（拡張子/MIME相当）
    allowed_ext = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
    images = item_data.images[:3] if item_data.images else []
    # DataURLが来る想定のため、拡張子チェックは限定的（先頭のMIMEを推定）
    validated: list[str] = []
    for url in images:
        if url.startswith("data:image/"):
            # data:image/png;base64,... から拡張子相当を抽出
            try:
                mime = url.split(";")[0].split(":",1)[1]  # image/png
                ext = "." + mime.split("/")[1]
            except Exception:
                ext = ""
        else:
            # URL/ファイル名から拡張子を抽出
            lower = url.lower()
            ext = None
            for e in allowed_ext:
                if lower.endswith(e):
                    ext = e
                    break
            if ext is None:
                ext = ""
        if ext in allowed_ext:
            # セキュリティ: data URL長の制限（約2MB相当）
            if url.startswith("data:") and len(url) > 3_000_000:
                continue
            validated.append(url)
    images = validated[:3]
    images_json = json.dumps(images) if images else json.dumps([])
    
    # 新しい商品を作成
    new_item = models.MarketItem(
        title=item_data.title,
        description=item_data.description,
        type=item_data.type,
        price=item_data.price,
        condition=item_data.condition,
        category=item_data.category or "書籍",
        images=images_json,
        author_id=current_user.id,
        author_name=anonymous_name,
        contact_method=item_data.contact_method,
        is_available=True
    )
    
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    # レスポンス形式に変換
    images = images
    
    return schemas.MarketItemResponse(
        id=str(new_item.id),
        title=new_item.title,
        description=new_item.description,
        type=new_item.type,
        price=new_item.price,
        condition=new_item.condition,
        category=new_item.category,
        images=images,
        author_name=new_item.author_name,
        university=current_user.university or "不明",
        contact_method=new_item.contact_method,
        is_available=new_item.is_available,
        created_at=new_item.created_at.isoformat(),
        updated_at=new_item.updated_at.isoformat(),
        view_count=new_item.view_count,
        like_count=new_item.like_count,
        is_liked=False
    )

@router.get("/items/{item_id}/comments", response_model=List[schemas.MarketItemCommentResponse])
def get_item_comments(item_id: int, response: Response, db: Session = Depends(database.get_db)):
    # テーブル存在エラー等を考慮して一度例外時にテーブル作成を試行
    try:
        comments = db.query(models.MarketItemComment).filter(models.MarketItemComment.item_id == item_id).order_by(models.MarketItemComment.created_at).all()
    except Exception:
        models.Base.metadata.create_all(bind=database.engine)
        comments = db.query(models.MarketItemComment).filter(models.MarketItemComment.item_id == item_id).order_by(models.MarketItemComment.created_at).all()
    # 明示的にCORSヘッダーを付与（GETは認証不要のため*で許可）
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Vary"] = "Origin"
    return [
        schemas.MarketItemCommentResponse(
            id=c.id,
            item_id=c.item_id,
            author_id=c.author_id,
            content=c.content,
            author_name=c.author_name,
            created_at=c.created_at.isoformat()
        ) for c in comments
    ]

@router.post("/items/{item_id}/comments", response_model=schemas.MarketItemCommentResponse)
def create_item_comment(item_id: int, data: schemas.MarketItemCommentCreate, request: Request, response: Response, db: Session = Depends(database.get_db)):
    current_user_email = get_current_user_email(request)
    current_user = get_user_by_email(db, current_user_email)
    if not current_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ユーザーが見つかりません")
    item = db.query(models.MarketItem).filter(models.MarketItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="商品が見つかりません")
    author_name = get_or_create_anonymous_name(current_user, db)
    comment = models.MarketItemComment(
        item_id=item_id,
        author_id=current_user.id,
        author_name=author_name,
        content=data.content.strip()
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    # 通知: 出品者にコメント通知
    try:
        if item.author_id and item.author_id != current_user.id:
            notif = models.Notification(
                user_id=item.author_id,
                actor_id=current_user.id,
                type="market_comment_added",
                entity_type="market_item",
                entity_id=item.id,
                title="あなたの出品にコメントがありました",
                message=comment.content[:120]
            )
            db.add(notif)
            db.commit()
    except Exception:
        pass
    # 明示的にCORSヘッダーを付与（POSTも許可、プリフライトはOPTIONSで対応）
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Vary"] = "Origin"
    return schemas.MarketItemCommentResponse(
        id=comment.id,
        item_id=comment.item_id,
        author_id=comment.author_id,
        content=comment.content,
        author_name=comment.author_name,
        created_at=comment.created_at.isoformat()
    )

@router.post("/items/{item_id}/comments/{comment_id}/like")
def toggle_comment_like(item_id: int, comment_id: int, request: Request, db: Session = Depends(database.get_db)):
    current_user_email = get_current_user_email(request)
    current_user = get_user_by_email(db, current_user_email)
    if not current_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ユーザーが見つかりません")
    comment = db.query(models.MarketItemComment).filter(models.MarketItemComment.id == comment_id, models.MarketItemComment.item_id == item_id).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="コメントが見つかりません")
    existing = db.query(models.MarketItemCommentLike).filter(
        and_(
            models.MarketItemCommentLike.comment_id == comment_id,
            models.MarketItemCommentLike.user_id == current_user.id
        )
    ).first()
    if existing:
        db.delete(existing)
        is_liked = False
    else:
        db.add(models.MarketItemCommentLike(comment_id=comment_id, user_id=current_user.id))
        is_liked = True
        # 通知: コメント作者にいいね通知（遷移先の都合で item に紐づけ）
        try:
            if comment.author_id and comment.author_id != current_user.id:
                notif = models.Notification(
                    user_id=comment.author_id,
                    actor_id=current_user.id,
                    type="market_comment_liked",
                    entity_type="market_item",
                    entity_id=comment.item_id,
                    title="あなたのコメントがいいねされました",
                    message=comment.content[:120]
                )
                db.add(notif)
        except Exception:
            pass
    db.commit()
    return {"message": "ok", "is_liked": is_liked}

@router.get("/notifications", response_model=List[schemas.NotificationResponse])
def get_notifications(request: Request, db: Session = Depends(database.get_db)):
    current_user_email = get_current_user_email(request)
    current_user = get_user_by_email(db, current_user_email)
    if not current_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ユーザーが見つかりません")
    notifs = db.query(models.Notification).filter(models.Notification.user_id == current_user.id).order_by(desc(models.Notification.created_at)).limit(50).all()
    return [
        schemas.NotificationResponse(
            id=n.id,
            type=n.type,
            title=n.title,
            message=n.message,
            entity_type=n.entity_type,
            entity_id=n.entity_id,
            is_read=n.is_read,
            created_at=n.created_at.isoformat()
        ) for n in notifs
    ]

@router.post("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, request: Request, db: Session = Depends(database.get_db)):
    current_user_email = get_current_user_email(request)
    current_user = get_user_by_email(db, current_user_email)
    if not current_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ユーザーが見つかりません")
    notif = db.query(models.Notification).filter(models.Notification.id == notification_id, models.Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="通知が見つかりません")
    notif.is_read = True
    db.commit()
    return {"message": "read"}

@router.post("/notifications/mark-all-read")
def mark_all_notifications_read(request: Request, db: Session = Depends(database.get_db)):
    """ユーザーの未読通知を全て既読化する"""
    current_user_email = get_current_user_email(request)
    current_user = get_user_by_email(db, current_user_email)
    if not current_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ユーザーが見つかりません")
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).update({models.Notification.is_read: True}, synchronize_session=False)
    db.commit()
    return {"message": "all_read"}

# コメント削除（本人/管理者）
@router.delete("/items/{item_id}/comments/{comment_id}")
def delete_item_comment(item_id: int, comment_id: int, request: Request, db: Session = Depends(database.get_db)):
    email = get_current_user_email(request)
    user = get_user_by_email(db, email)
    comment = db.query(models.MarketItemComment).filter(
        and_(
            models.MarketItemComment.id == comment_id,
            models.MarketItemComment.item_id == item_id
        )
    ).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="コメントが見つかりません")
    is_admin = bool(email and ADMIN_EMAIL_PATTERN.match(email.strip().lower()))
    if not (is_admin or (user and user.id == comment.author_id)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="削除権限がありません")
    db.delete(comment)
    db.commit()
    return {"message": "コメントを削除しました"}

# コメントエンドポイントのプリフライト対応
@router.options("/items/{item_id}/comments")
def options_item_comments(item_id: int, response: Response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Vary"] = "Origin"
    return {}

@router.put("/items/{item_id}", response_model=schemas.MarketItemResponse)
def update_market_item(
    item_id: int,
    item_data: schemas.MarketItemUpdate,
    request: Request,
    db: Session = Depends(database.get_db)
):
    """市場商品を更新"""
    
    # 現在のユーザーを取得
    current_user_email = get_current_user_email(request)
    current_user = get_user_by_email(db, current_user_email)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません"
        )
    
    # 商品を取得
    item = db.query(models.MarketItem).filter(models.MarketItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="商品が見つかりません"
        )
    
    # 権限チェック（作成者のみ更新可能）
    if item.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この商品を更新する権限がありません"
        )
    
    # 更新
    if item_data.title is not None:
        item.title = item_data.title
    if item_data.description is not None:
        item.description = item_data.description
    if item_data.price is not None:
        item.price = item_data.price
    if item_data.condition is not None:
        item.condition = item_data.condition
    if item_data.category is not None:
        item.category = item_data.category
    if item_data.images is not None:
        item.images = json.dumps(item_data.images) if item_data.images else None
    if item_data.contact_method is not None:
        item.contact_method = item_data.contact_method
    if item_data.is_available is not None:
        item.is_available = item_data.is_available
    
    item.updated_at = models.jst_now()
    db.commit()
    db.refresh(item)
    
    # レスポンス形式に変換
    images = []
    if item.images:
        try:
            images = json.loads(item.images)
        except:
            images = []
    
    return schemas.MarketItemResponse(
        id=str(item.id),
        title=item.title,
        description=item.description,
        type=item.type,
        price=item.price,
        condition=item.condition,
        category=item.category,
        images=images,
        author_name=item.author_name,
        university=item.author.university or "不明",
        contact_method=item.contact_method,
        is_available=item.is_available,
        created_at=item.created_at.isoformat(),
        updated_at=item.updated_at.isoformat(),
        view_count=item.view_count,
        like_count=item.like_count,
        is_liked=False
    )

@router.delete("/items/{item_id}")
def delete_market_item(
    item_id: int,
    request: Request,
    db: Session = Depends(database.get_db)
):
    """市場商品を削除"""
    
    # 現在のユーザーを取得
    current_user_email = get_current_user_email(request)
    current_user = get_user_by_email(db, current_user_email)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません"
        )
    
    # 商品を取得
    item = db.query(models.MarketItem).filter(models.MarketItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="商品が見つかりません"
        )
    
    # 権限チェック（作成者のみ削除可能）
    if item.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この商品を削除する権限がありません"
        )
    
    # 削除
    db.delete(item)
    db.commit()
    
    return {"message": "商品を削除しました"}

# 管理者: 出品を取り消し（論理的に非公開）
@router.post("/admin/items/{item_id}/cancel")
def admin_cancel_item(
    item_id: int,
    request: Request,
    db: Session = Depends(database.get_db)
):
    require_admin(request)
    item = db.query(models.MarketItem).filter(models.MarketItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="商品が見つかりません")
    item.is_available = False
    item.is_deleted = True
    item.updated_at = models.jst_now()
    db.commit()
    return {"message": "出品を取り消しました", "item_id": item_id, "is_available": item.is_available}

# 管理者: 出品を物理削除
@router.delete("/admin/items/{item_id}")
def admin_delete_item(
    item_id: int,
    request: Request,
    db: Session = Depends(database.get_db)
):
    require_admin(request)
    item = db.query(models.MarketItem).filter(models.MarketItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="商品が見つかりません")
    # 参照レコードを先に削除（外部キー制約回避）
    # コメントID一覧
    comment_ids_subq = db.query(models.MarketItemComment.id).filter(models.MarketItemComment.item_id == item_id)
    # コメントいいね
    if hasattr(models, 'MarketItemCommentLike'):
        db.query(models.MarketItemCommentLike).filter(models.MarketItemCommentLike.comment_id.in_(comment_ids_subq)).delete(synchronize_session=False)
    # コメント
    if hasattr(models, 'MarketItemComment'):
        db.query(models.MarketItemComment).filter(models.MarketItemComment.item_id == item_id).delete(synchronize_session=False)
    # いいね
    db.query(models.MarketItemLike).filter(models.MarketItemLike.item_id == item_id).delete(synchronize_session=False)
    # 通知（itemに紐づくもの）
    if hasattr(models, 'Notification'):
        db.query(models.Notification).filter(
            models.Notification.entity_type.in_(["market_item", "market_item_comment"]),
            models.Notification.entity_id == item_id
        ).delete(synchronize_session=False)
    # 本体を削除
    db.delete(item)
    db.commit()
    return {"message": "商品を削除しました(管理者)", "item_id": item_id}

@router.post("/items/{item_id}/like")
def toggle_like(
    item_id: int,
    request: Request,
    db: Session = Depends(database.get_db)
):
    """商品のいいねを切り替え"""
    
    # 現在のユーザーを取得
    current_user_email = get_current_user_email(request)
    current_user = get_user_by_email(db, current_user_email)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません"
        )
    
    # 商品を取得
    item = db.query(models.MarketItem).filter(models.MarketItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="商品が見つかりません"
        )
    
    # 既存のいいねをチェック
    existing_like = db.query(models.MarketItemLike).filter(
        and_(
            models.MarketItemLike.item_id == item_id,
            models.MarketItemLike.user_id == current_user.id
        )
    ).first()
    
    if existing_like:
        # いいねを削除
        db.delete(existing_like)
        item.like_count = max(0, item.like_count - 1)
        is_liked = False
    else:
        # いいねを追加
        new_like = models.MarketItemLike(
            item_id=item_id,
            user_id=current_user.id
        )
        db.add(new_like)
        item.like_count += 1
        is_liked = True
    
    db.commit()
    
    return {
        "message": "いいねを更新しました",
        "is_liked": is_liked,
        "like_count": item.like_count
    }

@router.get("/stats")
def get_market_stats(db: Session = Depends(database.get_db)):
    """市場の統計情報を取得"""
    
    # 基本統計
    total_items = db.query(models.MarketItem).filter(models.MarketItem.is_available == True).count()
    buy_items = db.query(models.MarketItem).filter(
        and_(models.MarketItem.is_available == True, models.MarketItem.type == "buy")
    ).count()
    sell_items = db.query(models.MarketItem).filter(
        and_(models.MarketItem.is_available == True, models.MarketItem.type == "sell")
    ).count()
    free_items = db.query(models.MarketItem).filter(
        and_(models.MarketItem.is_available == True, models.MarketItem.type == "free")
    ).count()
    
    # カテゴリ別統計
    categories = {}
    category_items = db.query(
        models.MarketItem.category,
        func.count(models.MarketItem.id).label('count')
    ).filter(models.MarketItem.is_available == True).group_by(models.MarketItem.category).all()
    
    for category, count in category_items:
        categories[category] = count
    
    return {
        "total_items": total_items,
        "buy_items": buy_items,
        "sell_items": sell_items,
        "free_items": free_items,
        "categories": categories
    }
