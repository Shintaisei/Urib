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

# 簡易ユーザー登録用スキーマ（認証なし）
class UserQuickRegister(BaseModel):
    email: Optional[str] = None
    nickname: str
    university: str
    year: str
    department: str

# ユーザー登録レスポンス
class UserRegisterResponse(BaseModel):
    user_id: int
    anonymous_name: str
    university: str
    year: str
    department: str

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

# 掲示板投稿関連のスキーマ
class BoardPostCreate(BaseModel):
    board_id: str
    content: str

class BoardPostResponse(BaseModel):
    id: int
    board_id: str
    content: str
    author_name: str
    author_year: Optional[str] = None  # 学年
    author_department: Optional[str] = None  # 学部
    like_count: int
    reply_count: int
    created_at: str
    is_liked: bool = False

class BoardReplyCreate(BaseModel):
    content: str

class BoardReplyResponse(BaseModel):
    id: int
    post_id: int
    content: str
    author_name: str
    author_year: Optional[str] = None  # 学年
    author_department: Optional[str] = None  # 学部
    like_count: int = 0
    is_liked: bool = False
    created_at: str
