from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

# SQLAlchemyのベースクラス（全ORMモデルの親）
Base = declarative_base()

# usersテーブルに対応するORMモデル
class User(Base):
    __tablename__ = "users"  # テーブル名
    __table_args__ = (
        # 複合インデックス：大学と学年（統計用）
        Index('idx_users_university_year', 'university', 'year'),
        # 複合インデックス：学部と学年（統計用）
        Index('idx_users_department_year', 'department', 'year'),
    )
    
    id = Column(Integer, primary_key=True, index=True)  # ユーザーID（主キー）
    email = Column(String(255), unique=True, nullable=True, index=True)  # 大学メールアドレス（任意）
    university = Column(String(255), index=True)  # 大学名
    year = Column(String(20), index=True)  # 学年（1年/2年/3年/4年/修士/博士）
    department = Column(String(100), index=True)  # 学部
    anonymous_name = Column(String(100), unique=True)  # 固定の匿名表示名（ニックネーム）
    is_verified = Column(Boolean, default=False)  # 認証済みかどうか
    verification_code = Column(String(255))  # 認証コード
    created_at = Column(DateTime, default=datetime.utcnow, index=True)  # 作成日時
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)  # 更新日時
    
    # リレーション
    market_items = relationship("MarketItem", back_populates="author")
    market_likes = relationship("MarketItemLike", back_populates="user")

# 市場掲示板の商品テーブル
class MarketItem(Base):
    __tablename__ = "market_items"
    __table_args__ = (
        # 複合インデックス：タイプと利用可能状態
        Index('idx_market_items_type_available', 'type', 'is_available'),
        # 複合インデックス：カテゴリと作成日時
        Index('idx_market_items_category_created', 'category', 'created_at'),
        # 複合インデックス：価格範囲検索用
        Index('idx_market_items_price_available', 'price', 'is_available'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)  # 商品名
    description = Column(Text, nullable=False)  # 商品説明
    type = Column(String(20), nullable=False, index=True)  # buy, sell, free
    price = Column(Integer, nullable=True)  # 価格（円）
    condition = Column(String(20), nullable=False)  # 商品状態
    category = Column(String(100), nullable=False, index=True)  # カテゴリ
    images = Column(Text, nullable=True)  # 画像URL（JSON形式）
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    author_name = Column(String(100), nullable=False)  # 匿名表示名
    contact_method = Column(String(20), nullable=False)  # 連絡方法
    is_available = Column(Boolean, default=True, index=True)  # 取引可能かどうか
    is_deleted = Column(Boolean, default=False)  # 論理削除フラグ
    view_count = Column(Integer, default=0)  # 閲覧数
    like_count = Column(Integer, default=0)  # いいね数
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # リレーション
    author = relationship("User", back_populates="market_items")
    likes = relationship("MarketItemLike", back_populates="item")

# 市場商品のいいねテーブル
class MarketItemLike(Base):
    __tablename__ = "market_item_likes"
    __table_args__ = (
        # 重複防止：同じユーザーが同じ商品に複数回いいねできない
        UniqueConstraint('item_id', 'user_id', name='uq_market_item_user'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("market_items.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # リレーション
    item = relationship("MarketItem", back_populates="likes")
    user = relationship("User", back_populates="market_likes")

# 掲示板投稿テーブル
class BoardPost(Base):
    __tablename__ = "board_posts"
    __table_args__ = (
        # 複合インデックス：掲示板IDと作成日時で高速検索
        Index('idx_board_posts_board_created', 'board_id', 'created_at'),
        # 複合インデックス：掲示板IDといいね数（人気順表示用）
        Index('idx_board_posts_board_likes', 'board_id', 'like_count'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    board_id = Column(String(50), nullable=False, index=True)  # 掲示板ID
    content = Column(Text, nullable=False)  # 投稿内容
    hashtags = Column(String(500), nullable=True)  # ハッシュタグ（カンマ区切り）
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    author_name = Column(String(100), nullable=False)  # 匿名表示名
    like_count = Column(Integer, default=0, index=True)  # いいね数
    reply_count = Column(Integer, default=0)  # 返信数
    is_deleted = Column(Boolean, default=False, index=True)  # 論理削除フラグ
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # リレーション
    author = relationship("User", backref="board_posts")
    likes = relationship("BoardPostLike", back_populates="post", cascade="all, delete-orphan")
    replies = relationship("BoardReply", back_populates="post", cascade="all, delete-orphan")

# 掲示板投稿のいいねテーブル
class BoardPostLike(Base):
    __tablename__ = "board_post_likes"
    __table_args__ = (
        # 重複防止：同じユーザーが同じ投稿に複数回いいねできない
        UniqueConstraint('post_id', 'user_id', name='uq_board_post_user'),
        # 複合インデックス：パフォーマンス向上
        Index('idx_board_post_likes_composite', 'post_id', 'user_id'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("board_posts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # リレーション
    post = relationship("BoardPost", back_populates="likes")
    user = relationship("User", backref="board_post_likes")

# 掲示板投稿への返信テーブル
class BoardReply(Base):
    __tablename__ = "board_replies"
    __table_args__ = (
        # 複合インデックス：投稿IDと作成日時
        Index('idx_board_replies_post_created', 'post_id', 'created_at'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("board_posts.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    author_name = Column(String(100), nullable=False)  # 匿名表示名
    like_count = Column(Integer, default=0)  # いいね数
    is_deleted = Column(Boolean, default=False)  # 論理削除フラグ
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # リレーション
    post = relationship("BoardPost", back_populates="replies")
    author = relationship("User", backref="board_replies")
    likes = relationship("BoardReplyLike", back_populates="reply", cascade="all, delete-orphan")

# 掲示板返信のいいねテーブル
class BoardReplyLike(Base):
    __tablename__ = "board_reply_likes"
    __table_args__ = (
        # 重複防止：同じユーザーが同じ返信に複数回いいねできない
        UniqueConstraint('reply_id', 'user_id', name='uq_board_reply_user'),
        # 複合インデックス：パフォーマンス向上
        Index('idx_board_reply_likes_composite', 'reply_id', 'user_id'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    reply_id = Column(Integer, ForeignKey("board_replies.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # リレーション
    reply = relationship("BoardReply", back_populates="likes")
    user = relationship("User", backref="board_reply_likes")
