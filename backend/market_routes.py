from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc, func
from typing import List, Optional
from datetime import datetime
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
    
    # 画像をJSON文字列に変換
    images_json = json.dumps(item_data.images) if item_data.images else None
    
    # 新しい商品を作成
    new_item = models.MarketItem(
        title=item_data.title,
        description=item_data.description,
        type=item_data.type,
        price=item_data.price,
        condition=item_data.condition,
        category=item_data.category,
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
    images = item_data.images or []
    
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
    
    item.updated_at = datetime.utcnow()
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
