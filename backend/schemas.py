from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# 新規ユーザー作成時のリクエスト用スキーマ
class UserCreate(BaseModel):
    email: EmailStr  # ユーザーの大学メールアドレス

# 認証コード検証時のリクエスト用スキーマ
class UserVerify(BaseModel):
    email: EmailStr  # ユーザーの大学メールアドレス
    code: str        # 認証コード

# 市場掲示板関連のスキーマ
class MarketItemCreate(BaseModel):
    title: str
    description: str
    type: str  # buy, sell, free
    price: Optional[int] = None
    condition: str  # new, like_new, good, fair, poor
    category: str
    images: List[str] = []
    contact_method: str  # dm, email, phone

class MarketItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = None
    condition: Optional[str] = None
    category: Optional[str] = None
    images: Optional[List[str]] = None
    contact_method: Optional[str] = None
    is_available: Optional[bool] = None

class MarketItemResponse(BaseModel):
    id: str
    title: str
    description: str
    type: str
    price: Optional[int]
    condition: str
    category: str
    images: List[str]
    author_name: str
    university: str
    contact_method: str
    is_available: bool
    created_at: str
    updated_at: str
    view_count: int
    like_count: int
    is_liked: Optional[bool] = False

class MarketStats(BaseModel):
    total_items: int
    buy_items: int
    sell_items: int
    free_items: int
    categories: dict
