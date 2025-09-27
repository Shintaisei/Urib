from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

# SQLAlchemyのベースクラス（全ORMモデルの親）
Base = declarative_base()

# usersテーブルに対応するORMモデル
class User(Base):
    __tablename__ = "users"  # テーブル名
    id = Column(Integer, primary_key=True, index=True)  # ユーザーID（主キー）
    email = Column(String(255), unique=True, nullable=False)  # 大学メールアドレス
    university = Column(String(255))  # 大学名やドメイン
    is_verified = Column(Boolean, default=False)  # 認証済みかどうか
    verification_code = Column(String(255))  # 認証コード
    created_at = Column(DateTime, default=datetime.utcnow)  # 作成日時
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)  # 更新日時
    
    # リレーション
    market_items = relationship("MarketItem", back_populates="author")
    market_likes = relationship("MarketItemLike", back_populates="user")

# 市場掲示板の商品テーブル
class MarketItem(Base):
    __tablename__ = "market_items"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)  # 商品名
    description = Column(Text, nullable=False)  # 商品説明
    type = Column(String(20), nullable=False)  # buy, sell, free
    price = Column(Integer, nullable=True)  # 価格（円）
    condition = Column(String(20), nullable=False)  # 商品状態
    category = Column(String(100), nullable=False)  # カテゴリ
    images = Column(Text, nullable=True)  # 画像URL（JSON形式）
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    author_name = Column(String(100), nullable=False)  # 匿名表示名
    contact_method = Column(String(20), nullable=False)  # 連絡方法
    is_available = Column(Boolean, default=True)  # 取引可能かどうか
    view_count = Column(Integer, default=0)  # 閲覧数
    like_count = Column(Integer, default=0)  # いいね数
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # リレーション
    author = relationship("User", back_populates="market_items")
    likes = relationship("MarketItemLike", back_populates="item")

# 市場商品のいいねテーブル
class MarketItemLike(Base):
    __tablename__ = "market_item_likes"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("market_items.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # リレーション
    item = relationship("MarketItem", back_populates="likes")
    user = relationship("User", back_populates="market_likes")
