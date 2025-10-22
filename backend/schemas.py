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
    category: Optional[str] = None  # 書籍前提のため省略可（サーバ側で既定値）
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

# 市場コメント
class MarketItemCommentCreate(BaseModel):
    content: str

class MarketItemCommentResponse(BaseModel):
    id: int
    item_id: int
    author_id: Optional[int] = None
    content: str
    author_name: str
    created_at: str

class NotificationResponse(BaseModel):
    id: int
    type: str
    title: Optional[str] = None
    message: Optional[str] = None
    entity_type: str
    entity_id: int
    is_read: bool
    created_at: str

# 掲示板投稿関連のスキーマ
class BoardPostCreate(BaseModel):
    board_id: str
    content: str
    hashtags: Optional[str] = None  # ハッシュタグ（カンマ区切り）

class BoardPostResponse(BaseModel):
    id: int
    board_id: str
    content: str
    hashtags: Optional[str] = None  # ハッシュタグ（カンマ区切り）
    author_name: str
    author_year: Optional[str] = None  # 学年
    author_department: Optional[str] = None  # 学部
    like_count: int
    reply_count: int
    created_at: str
    is_liked: bool = False
    has_replied: Optional[bool] = False
    new_replies_since_my_last_reply: Optional[int] = 0

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

# =====================
# DM Schemas
# =====================

class DMConversationCreate(BaseModel):
    partner_email: Optional[str] = None
    partner_user_id: Optional[int] = None

class DMConversationResponse(BaseModel):
    id: int
    partner_email: Optional[str] = None
    partner_name: Optional[str] = None
    last_message: Optional[str] = None
    last_message_at: Optional[str] = None
    unread_count: int
    created_at: str
    updated_at: str

class DMMessageCreate(BaseModel):
    conversation_id: int
    content: str

class DMMessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_email: Optional[str] = None
    content: str
    created_at: str

# =====================
# Course Summary Schemas
# =====================

class CourseSummaryCreate(BaseModel):
    title: str
    course_name: Optional[str] = None
    instructor: Optional[str] = None
    department: Optional[str] = None
    year_semester: Optional[str] = None
    tags: Optional[str] = None
    content: str

class CourseSummaryResponse(BaseModel):
    id: int
    title: str
    course_name: Optional[str] = None
    instructor: Optional[str] = None
    department: Optional[str] = None
    year_semester: Optional[str] = None
    tags: Optional[str] = None
    content: str
    author_name: str
    like_count: int
    comment_count: int
    created_at: str

class CourseSummaryCommentCreate(BaseModel):
    content: str

class CourseSummaryCommentResponse(BaseModel):
    id: int
    summary_id: int
    author_name: str
    content: str
    created_at: str

# =====================
# Circle Summary Schemas
# =====================

class CircleSummaryCreate(BaseModel):
    title: str
    circle_name: Optional[str] = None
    category: Optional[str] = None
    activity_days: Optional[str] = None
    activity_place: Optional[str] = None
    cost: Optional[str] = None
    links: Optional[str] = None
    tags: Optional[str] = None
    content: str

class CircleSummaryResponse(BaseModel):
    id: int
    title: str
    circle_name: Optional[str] = None
    category: Optional[str] = None
    activity_days: Optional[str] = None
    activity_place: Optional[str] = None
    cost: Optional[str] = None
    links: Optional[str] = None
    tags: Optional[str] = None
    content: str
    author_name: str
    like_count: int
    comment_count: int
    created_at: str

class CircleSummaryCommentCreate(BaseModel):
    content: str

class CircleSummaryCommentResponse(BaseModel):
    id: int
    summary_id: int
    author_name: str
    content: str
    created_at: str
