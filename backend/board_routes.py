from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, func
from typing import List
from datetime import datetime
import models, schemas, database
import random
import string
import re

router = APIRouter(prefix="/board", tags=["board"])

def ensure_jst_aware(dt):
    """datetime オブジェクトが JST aware であることを保証"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        # naive datetime はUTC起点とみなしJSTへ変換する
        return dt.replace(tzinfo=models.timezone.utc).astimezone(models.JST)
    # tz-aware はJSTへ変換（UTCなどからのズレを解消）
    return dt.astimezone(models.JST)

# 掲示板統計情報を取得
@router.get("/stats")
def get_board_stats(db: Session = Depends(database.get_db)):
    """各掲示板の統計情報（投稿数、コメント数、最終投稿時刻）を取得"""
    board_ids = [1, 2, 3, 4, 5, 6]
    stats = []
    
    for board_id in board_ids:
        # 投稿数を取得
        post_count = db.query(models.BoardPost).filter(
            models.BoardPost.board_id == str(board_id)
        ).count()
        
        # コメント数を取得（各投稿のreply_countの合計）
        total_replies = db.query(func.sum(models.BoardPost.reply_count)).filter(
            models.BoardPost.board_id == str(board_id)
        ).scalar() or 0
        
        # いいね数を取得
        total_likes = db.query(func.sum(models.BoardPost.like_count)).filter(
            models.BoardPost.board_id == str(board_id)
        ).scalar() or 0
        
        # 最終投稿時刻を取得
        latest_post = db.query(models.BoardPost).filter(
            models.BoardPost.board_id == str(board_id)
        ).order_by(desc(models.BoardPost.created_at)).first()
        
        # 最終活動時刻をJSTのISO文字列に統一
        last_activity = ensure_jst_aware(latest_post.created_at).isoformat() if latest_post else None

        # 参加者数を取得（この掲示板を一度でも開いたユーザー数）
        participant_count = db.query(func.count(models.BoardVisit.id)).filter(
            models.BoardVisit.board_id == str(board_id)
        ).scalar() or 0
        
        # 人気のハッシュタグを取得（この掲示板の最新3件の投稿から）
        recent_posts_with_tags = db.query(models.BoardPost.hashtags).filter(
            and_(
                models.BoardPost.board_id == str(board_id),
                models.BoardPost.hashtags.isnot(None),
                models.BoardPost.hashtags != ""
            )
        ).order_by(desc(models.BoardPost.created_at)).limit(5).all()
        
        # ハッシュタグを抽出
        all_tags = []
        for (tags,) in recent_posts_with_tags:
            if tags:
                all_tags.extend([tag.strip() for tag in tags.split() if tag.strip()])
        
        # 重複を削除して最大3つまで
        unique_tags = []
        for tag in all_tags:
            if tag not in unique_tags:
                unique_tags.append(tag)
            if len(unique_tags) >= 3:
                break
        
        stats.append({
            "board_id": board_id,
            "post_count": post_count,
            "reply_count": int(total_replies),
            "like_count": int(total_likes),
            "last_activity": last_activity,
            "popular_hashtags": unique_tags,
            "participant_count": int(participant_count)
        })
    
    return {"stats": stats}

# 全体の人気投稿・最新投稿を取得
@router.get("/posts/feed")
def get_feed_posts(
    feed_type: str = Query("latest", description="latest, popular, trending"),
    limit: int = Query(10, description="取得件数"),
    request: Request = None,
    db: Session = Depends(database.get_db)
):
    """全掲示板から人気投稿・最新投稿を取得"""
    
    # 現在のユーザーを取得
    current_user_id = get_current_user_id(request) if request else None
    current_user = get_user_by_id(db, current_user_id) if current_user_id else None
    
    # フィードタイプに応じてクエリを変更
    query = db.query(models.BoardPost)
    
    if feed_type == "popular":
        # いいね数が多い順
        query = query.order_by(desc(models.BoardPost.like_count), desc(models.BoardPost.created_at))
    elif feed_type == "trending":
        # コメント数が多い順
        query = query.order_by(desc(models.BoardPost.reply_count), desc(models.BoardPost.created_at))
    elif feed_type == "no_comments":
        # 返信がまだついていない投稿（コメント一番乗り）
        query = query.filter(models.BoardPost.reply_count == 0).order_by(desc(models.BoardPost.created_at))
    else:
        # 最新順（デフォルト）
        query = query.order_by(desc(models.BoardPost.created_at))
    
    posts = query.limit(limit).all()
    
    # レスポンス形式に変換
    result = []
    for post in posts:
        # いいねしているかチェック
        is_liked = False
        if current_user:
            is_liked = db.query(models.BoardPostLike).filter(
                and_(
                    models.BoardPostLike.post_id == post.id,
                    models.BoardPostLike.user_id == current_user.id
                )
            ).first() is not None
        
        result.append({
            "id": post.id,
            "board_id": post.board_id,
            "content": post.content,
            "hashtags": post.hashtags,
            "author_name": post.author_name,
            "author_year": post.author.year if post.author else None,
            "author_department": post.author.department if post.author else None,
            "like_count": post.like_count,
            "reply_count": post.reply_count,
            "created_at": ensure_jst_aware(post.created_at).isoformat(),
            "is_liked": is_liked
        })
    
    return {"posts": result}

@router.get("/replies/feed")
def get_feed_replies(
    limit: int = Query(10, description="取得件数"),
    request: Request = None,
    db: Session = Depends(database.get_db)
):
    """全掲示板から最新の返信を取得（返信内容＋親投稿の要約）"""
    current_user_id = get_current_user_id(request) if request else None
    current_user = get_user_by_id(db, current_user_id) if current_user_id else None

    replies = db.query(models.BoardReply).order_by(desc(models.BoardReply.created_at)).limit(limit).all()
    items = []
    for reply in replies:
        post = db.query(models.BoardPost).filter(models.BoardPost.id == reply.post_id).first()
        if not post:
            continue
        # 返信のいいね済み判定
        is_liked = False
        if current_user:
            is_liked = db.query(models.BoardReplyLike).filter(
                and_(
                    models.BoardReplyLike.reply_id == reply.id,
                    models.BoardReplyLike.user_id == current_user.id
                )
            ).first() is not None

        items.append({
            "reply": {
                "id": reply.id,
                "post_id": reply.post_id,
                "content": reply.content,
                "author_name": reply.author_name,
                "author_year": reply.author.year if reply.author else None,
                "author_department": reply.author.department if reply.author else None,
                "like_count": reply.like_count,
                "is_liked": is_liked,
                "created_at": ensure_jst_aware(reply.created_at).isoformat(),
            },
            "post": {
                "id": post.id,
                "board_id": post.board_id,
                "content": post.content,
                "hashtags": post.hashtags,
                "author_name": post.author_name,
                "author_year": post.author.year if post.author else None,
                "author_department": post.author.department if post.author else None,
                "like_count": post.like_count,
                "reply_count": post.reply_count,
                "created_at": ensure_jst_aware(post.created_at).isoformat(),
            }
        })

    return {"items": items}

# 全文検索API
@router.get("/search")
def search_posts_and_replies(
    query: str = Query(..., min_length=1, description="検索キーワード"),
    db: Session = Depends(database.get_db)
):
    """投稿とコメントを全文検索"""
    if not query or len(query.strip()) == 0:
        return {"results": []}
    
    search_term = f"%{query.strip()}%"
    
    # 投稿を検索（本文とハッシュタグの両方を検索）
    matching_posts = db.query(models.BoardPost).filter(
        (models.BoardPost.content.like(search_term)) | 
        (models.BoardPost.hashtags.like(search_term))
    ).order_by(desc(models.BoardPost.created_at)).all()
    
    # コメントを検索
    matching_replies = db.query(models.BoardReply).filter(
        models.BoardReply.content.like(search_term)
    ).order_by(desc(models.BoardReply.created_at)).all()
    
    # コメントが見つかった場合、その投稿も含める
    post_ids_from_replies = set([reply.post_id for reply in matching_replies])
    posts_from_replies = db.query(models.BoardPost).filter(
        models.BoardPost.id.in_(post_ids_from_replies)
    ).all() if post_ids_from_replies else []
    
    # 重複を除いて投稿をマージ
    all_post_ids = set([post.id for post in matching_posts])
    for post in posts_from_replies:
        if post.id not in all_post_ids:
            matching_posts.append(post)
            all_post_ids.add(post.id)
    
    # 結果を整形
    results = []
    for post in matching_posts:
        # この投稿に関連する検索マッチしたコメントを取得
        post_matching_replies = [r for r in matching_replies if r.post_id == post.id]
        
        # 投稿者情報を取得
        author = get_user_by_id(db, post.author_id)
        
        results.append({
            "post_id": post.id,
            "board_id": post.board_id,
            "content": post.content,
            "hashtags": post.hashtags,
            "author_name": post.author_name,
            "author_year": author.year if author else None,
            "author_department": author.department if author else None,
            "like_count": post.like_count,
            "reply_count": post.reply_count,
            "created_at": post.created_at,  # ソート用にdatetimeオブジェクトを保持
            "matched_in_post": query.lower() in post.content.lower(),
            "matched_in_hashtags": post.hashtags and query.lower() in post.hashtags.lower(),
            "matched_replies": [
                {
                    "id": reply.id,
                    "content": reply.content,
                    "author_name": reply.author_name,
                    "created_at": ensure_jst_aware(reply.created_at).isoformat()
                }
                for reply in post_matching_replies
            ]
        })
    
    # 作成日時の降順でソート
    results.sort(key=lambda x: x["created_at"], reverse=True)
    
    # ソート後、created_atをISO形式の文字列に変換
    for result in results:
        result["created_at"] = ensure_jst_aware(result["created_at"]).isoformat()
    
    return {
        "query": query,
        "total_results": len(results),
        "results": results
    }

def get_current_user_id(request: Request):
    """現在のユーザーのIDを取得"""
    # X-User-Id ヘッダーから取得
    user_id = request.headers.get("X-User-Id")
    if user_id:
        try:
            return int(user_id)
        except:
            pass
    
    # 旧方式: X-Dev-Email ヘッダーから取得（後方互換性）
    dev_email = request.headers.get("X-Dev-Email")
    if dev_email:
        if dev_email.startswith("dev:"):
            dev_email = dev_email[4:]
        user = get_user_by_email(None, dev_email)
        if user:
            return user.id
    
    return None

def get_user_by_email(db: Session, email: str):
    """emailでユーザーを取得"""
    if not db:
        # dbがNoneの場合は新しいセッションを作成
        db = database.SessionLocal()
        try:
            return db.query(models.User).filter(models.User.email == email).first()
        finally:
            db.close()
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_id(db: Session, user_id: int):
    """IDでユーザーを取得"""
    return db.query(models.User).filter(models.User.id == user_id).first()

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

# -----------------------------
# 管理者判定と保護ユーティリティ
# -----------------------------
# master00, master01-09 を含め、master1-30 を許可
ADMIN_EMAIL_PATTERN = re.compile(r"^(master|mster)(00|0?[1-9]|[1-2][0-9]|30)@(?:[\w.-]+\.)?ac\.jp$", re.IGNORECASE)

def is_admin_user(user) -> bool:
    """メールが master1..master30@ac.jp のユーザーを管理者として扱う"""
    if not user or not getattr(user, "email", None):
        return False
    return ADMIN_EMAIL_PATTERN.match(user.email or "") is not None

def require_admin(request: Request, db: Session) -> models.User:
    """管理者のみ許可。非管理者は403を返す。"""
    current_user_id = get_current_user_id(request)
    if not current_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ユーザーIDが見つかりません")
    user = get_user_by_id(db, current_user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ユーザーが見つかりません")
    if not is_admin_user(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="管理者のみが実行できます")
    return user

@router.get("/posts/{board_id}", response_model=List[schemas.BoardPostResponse])
def get_board_posts(
    board_id: str,
    request: Request,
    limit: int = Query(50, description="取得件数"),
    offset: int = Query(0, description="オフセット"),
    db: Session = Depends(database.get_db)
):
    """掲示板の投稿一覧を取得"""
    
    # 投稿を取得
    posts = db.query(models.BoardPost).filter(
        models.BoardPost.board_id == board_id
    ).order_by(desc(models.BoardPost.created_at)).offset(offset).limit(limit).all()
    
    # 現在のユーザーを取得（X-User-Id優先、なければX-Dev-Email）
    current_user_id = get_current_user_id(request)
    current_user = get_user_by_id(db, current_user_id) if current_user_id else None
    if not current_user:
        dev_email = request.headers.get("X-Dev-Email")
        if dev_email:
            if dev_email.startswith("dev:"):
                dev_email = dev_email[4:]
            current_user = get_user_by_email(db, dev_email)
    
    # 現在ユーザーの最終閲覧時刻（返信一覧を開いた時）をまとめて取得
    user_last_view = {}
    if current_user:
        rows = db.query(models.BoardRepliesView.post_id, models.BoardRepliesView.last_viewed_at).filter(
            models.BoardRepliesView.user_id == current_user.id
        ).all()
        for post_id, last_viewed_at in rows:
            user_last_view[post_id] = last_viewed_at

    result = []
    for post in posts:
        is_liked = False
        if current_user:
            is_liked = db.query(models.BoardPostLike).filter(
                and_(
                    models.BoardPostLike.post_id == post.id,
                    models.BoardPostLike.user_id == current_user.id
                )
            ).first() is not None
        has_replied = db.query(models.BoardReply.id).filter(
            and_(models.BoardReply.post_id == post.id, models.BoardReply.author_id == (current_user.id if current_user else -1))
        ).first() is not None
        new_replies_count = 0
        last_view = user_last_view.get(post.id)
        if last_view:
            new_replies_count = db.query(func.count(models.BoardReply.id)).filter(
                and_(
                    models.BoardReply.post_id == post.id,
                    models.BoardReply.created_at > last_view
                )
            ).scalar() or 0

        result.append(schemas.BoardPostResponse(
            id=post.id,
            board_id=post.board_id,
            content=post.content,
            hashtags=post.hashtags,
            author_name=post.author_name,
            author_year=post.author.year if post.author else None,
            author_department=post.author.department if post.author else None,
            like_count=post.like_count,
            reply_count=post.reply_count,
            created_at=ensure_jst_aware(post.created_at).isoformat(),
            is_liked=is_liked,
            has_replied=has_replied,
            new_replies_since_my_last_reply=int(new_replies_count)
        ))
    
    return result

@router.post("/posts/{post_id}/replies/view")
def mark_replies_viewed(post_id: int, request: Request, db: Session = Depends(database.get_db)):
    """返信一覧を開いたタイミングで最終閲覧時刻を記録（バッジの基準）"""
    current_user_id = get_current_user_id(request)
    if not current_user_id:
        # 旧方式のフォールバック
        dev_email = request.headers.get("X-Dev-Email")
        if dev_email:
            if dev_email.startswith("dev:"):
                dev_email = dev_email[4:]
            user = get_user_by_email(db, dev_email)
            current_user_id = user.id if user else None
    if not current_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ユーザーIDが見つかりません")

    view = db.query(models.BoardRepliesView).filter(
        and_(models.BoardRepliesView.user_id == current_user_id, models.BoardRepliesView.post_id == post_id)
    ).first()
    now = models.jst_now()
    if view:
        view.last_viewed_at = now
    else:
        db.add(models.BoardRepliesView(user_id=current_user_id, post_id=post_id, last_viewed_at=now))
    db.commit()
    return {"message": "ok", "post_id": post_id}

@router.post("/posts", response_model=schemas.BoardPostResponse)
def create_board_post(
    post_data: schemas.BoardPostCreate,
    request: Request,
    db: Session = Depends(database.get_db)
):
    """新しい投稿を作成"""
    
    # 現在のユーザーを取得
    current_user_id = get_current_user_id(request)
    if not current_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ユーザーIDが見つかりません"
        )
    
    current_user = get_user_by_id(db, current_user_id)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません"
        )
    
    # ユーザーの固定匿名名を取得または生成
    anonymous_name = get_or_create_anonymous_name(current_user, db)
    
    # 新しい投稿を作成
    new_post = models.BoardPost(
        board_id=post_data.board_id,
        content=post_data.content,
        hashtags=post_data.hashtags,
        author_id=current_user.id,
        author_name=anonymous_name
    )
    
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    
    return schemas.BoardPostResponse(
        id=new_post.id,
        board_id=new_post.board_id,
        content=new_post.content,
        hashtags=new_post.hashtags,
        author_name=new_post.author_name,
        author_year=current_user.year,
        author_department=current_user.department,
        like_count=new_post.like_count,
        reply_count=new_post.reply_count,
        created_at=ensure_jst_aware(new_post.created_at).isoformat(),
        is_liked=False
    )

@router.post("/posts/{post_id}/like")
def toggle_post_like(
    post_id: int,
    request: Request,
    db: Session = Depends(database.get_db)
):
    """投稿のいいねを切り替え"""
    
    # 現在のユーザーを取得
    current_user_id = get_current_user_id(request)
    if not current_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ユーザーIDが見つかりません"
        )
    
    current_user = get_user_by_id(db, current_user_id)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません"
        )
    
    # 投稿を取得
    post = db.query(models.BoardPost).filter(models.BoardPost.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="投稿が見つかりません"
        )
    
    # 既存のいいねをチェック
    existing_like = db.query(models.BoardPostLike).filter(
        and_(
            models.BoardPostLike.post_id == post_id,
            models.BoardPostLike.user_id == current_user.id
        )
    ).first()
    
    if existing_like:
        # いいねを削除
        db.delete(existing_like)
        post.like_count = max(0, post.like_count - 1)
        is_liked = False
    else:
        # いいねを追加
        new_like = models.BoardPostLike(
            post_id=post_id,
            user_id=current_user.id
        )
        db.add(new_like)
        post.like_count += 1
        is_liked = True
    
    db.commit()
    
    return {
        "message": "いいねを更新しました",
        "is_liked": is_liked,
        "like_count": post.like_count
    }

@router.get("/posts/{post_id}/replies", response_model=List[schemas.BoardReplyResponse])
def get_post_replies(
    post_id: int,
    request: Request,
    db: Session = Depends(database.get_db)
):
    """投稿への返信一覧を取得"""
    
    # 返信を取得
    replies = db.query(models.BoardReply).filter(
        models.BoardReply.post_id == post_id
    ).order_by(models.BoardReply.created_at).all()
    
    # 現在のユーザーを取得
    current_user_id = get_current_user_id(request)
    current_user = get_user_by_id(db, current_user_id) if current_user_id else None
    
    result = []
    for reply in replies:
        # いいねしているかチェック
        is_liked = False
        if current_user:
            is_liked = db.query(models.BoardReplyLike).filter(
                and_(
                    models.BoardReplyLike.reply_id == reply.id,
                    models.BoardReplyLike.user_id == current_user.id
                )
            ).first() is not None
        
        result.append(schemas.BoardReplyResponse(
            id=reply.id,
            post_id=reply.post_id,
            content=reply.content,
            author_name=reply.author_name,
            author_year=reply.author.year if reply.author else None,
            author_department=reply.author.department if reply.author else None,
            like_count=reply.like_count,
            is_liked=is_liked,
            created_at=ensure_jst_aware(reply.created_at).isoformat()
        ))
    
    # 閲覧記録を更新（バッジの基準）
    try:
        viewer_id = get_current_user_id(request)
        if not viewer_id:
            dev_email = request.headers.get("X-Dev-Email")
            if dev_email:
                if dev_email.startswith("dev:"):
                    dev_email = dev_email[4:]
                user = get_user_by_email(db, dev_email)
                viewer_id = user.id if user else None
        if viewer_id:
            view = db.query(models.BoardRepliesView).filter(
                and_(models.BoardRepliesView.user_id == viewer_id, models.BoardRepliesView.post_id == post_id)
            ).first()
            now = models.jst_now()
            if view:
                view.last_viewed_at = now
            else:
                db.add(models.BoardRepliesView(user_id=viewer_id, post_id=post_id, last_viewed_at=now))
            db.commit()
    except Exception:
        pass

    return result

# 投稿IDからboard_idを解決
@router.get("/posts/{post_id}/board")
def resolve_board_id(post_id: int, db: Session = Depends(database.get_db)):
    post = db.query(models.BoardPost).filter(models.BoardPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="投稿が見つかりません")
    return {"board_id": post.board_id}

@router.post("/posts/{post_id}/replies", response_model=schemas.BoardReplyResponse)
def create_reply(
    post_id: int,
    reply_data: schemas.BoardReplyCreate,
    request: Request,
    db: Session = Depends(database.get_db)
):
    """投稿に返信を追加"""
    
    # 現在のユーザーを取得
    current_user_id = get_current_user_id(request)
    if not current_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ユーザーIDが見つかりません"
        )
    
    current_user = get_user_by_id(db, current_user_id)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません"
        )
    
    # 投稿を取得
    post = db.query(models.BoardPost).filter(models.BoardPost.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="投稿が見つかりません"
        )
    
    # ユーザーの固定匿名名を取得または生成
    anonymous_name = get_or_create_anonymous_name(current_user, db)
    
    # 返信を作成
    new_reply = models.BoardReply(
        post_id=post_id,
        content=reply_data.content,
        author_id=current_user.id,
        author_name=anonymous_name
    )
    
    db.add(new_reply)
    
    # 投稿の返信数を更新
    post.reply_count += 1
    
    db.commit()
    db.refresh(new_reply)
    
    # 通知: 投稿者に「返信がつきました」
    try:
        if post.author_id and post.author_id != current_user.id:
            notif = models.Notification(
                user_id=post.author_id,
                actor_id=current_user.id,
                type="post_replied",
                entity_type="board_post",
                entity_id=int(post.board_id),
                title="あなたの投稿に返信がありました",
                message=(new_reply.content[:120] + f"||post_id={post.id}")
            )
            db.add(notif)
            db.commit()
    except Exception:
        pass

    return schemas.BoardReplyResponse(
        id=new_reply.id,
        post_id=new_reply.post_id,
        content=new_reply.content,
        author_name=new_reply.author_name,
        author_year=current_user.year,
        author_department=current_user.department,
        like_count=new_reply.like_count,
        is_liked=False,
        created_at=ensure_jst_aware(new_reply.created_at).isoformat()
    )

@router.post("/replies/{reply_id}/like")
def toggle_reply_like(
    reply_id: int,
    request: Request,
    db: Session = Depends(database.get_db)
):
    """返信のいいねを切り替え"""
    
    # 現在のユーザーを取得
    current_user_id = get_current_user_id(request)
    if not current_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ユーザーIDが見つかりません"
        )
    
    current_user = get_user_by_id(db, current_user_id)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません"
        )
    
    # 返信を取得
    reply = db.query(models.BoardReply).filter(models.BoardReply.id == reply_id).first()
    if not reply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="返信が見つかりません"
        )
    
    # 既存のいいねをチェック
    existing_like = db.query(models.BoardReplyLike).filter(
        and_(
            models.BoardReplyLike.reply_id == reply_id,
            models.BoardReplyLike.user_id == current_user.id
        )
    ).first()
    
    if existing_like:
        # いいねを削除
        db.delete(existing_like)
        reply.like_count = max(0, reply.like_count - 1)
        is_liked = False
    else:
        # いいねを追加
        new_like = models.BoardReplyLike(
            reply_id=reply_id,
            user_id=current_user.id
        )
        db.add(new_like)
        reply.like_count += 1
        is_liked = True
    
    db.commit()
    
    # 通知: 返信の作者に「いいねされました」
    try:
        if reply.author_id and reply.author_id != current_user.id:
            parent_post = db.query(models.BoardPost).filter(models.BoardPost.id == reply.post_id).first()
            notif = models.Notification(
                user_id=reply.author_id,
                actor_id=current_user.id,
                type="reply_liked",
                entity_type="board_post",
                entity_id=int(parent_post.board_id) if parent_post else 1,
                title="あなたの返信がいいねされました",
                message=(reply.content[:120] + (f"||post_id={reply.post_id}" if parent_post else ""))
            )
            db.add(notif)
            db.commit()
    except Exception:
        pass

    return {
        "message": "いいねを更新しました",
        "is_liked": is_liked,
        "like_count": reply.like_count
    }

@router.delete("/admin/posts/{post_id}")
def admin_delete_post(
    post_id: int,
    request: Request,
    db: Session = Depends(database.get_db)
):
    """管理者専用: 投稿を物理削除"""
    # 認可
    require_admin(request, db)

    post = db.query(models.BoardPost).filter(models.BoardPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="投稿が見つかりません")

    db.delete(post)
    db.commit()
    return {"message": "投稿を削除しました", "post_id": post_id}

@router.delete("/admin/replies/{reply_id}")
def admin_delete_reply(
    reply_id: int,
    request: Request,
    db: Session = Depends(database.get_db)
):
    """管理者専用: 返信を物理削除（親投稿の返信数も調整）"""
    # 認可
    require_admin(request, db)

    reply = db.query(models.BoardReply).filter(models.BoardReply.id == reply_id).first()
    if not reply:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="返信が見つかりません")

    # 親投稿の返信数を調整
    parent_post = db.query(models.BoardPost).filter(models.BoardPost.id == reply.post_id).first()
    if parent_post and parent_post.reply_count and parent_post.reply_count > 0:
        parent_post.reply_count -= 1

    db.delete(reply)
    db.commit()
    return {"message": "返信を削除しました", "reply_id": reply_id}

# -----------------------------
# 新着件数と訪問記録
# -----------------------------

@router.get("/new-counts")
def get_new_counts(request: Request, db: Session = Depends(database.get_db)):
    """ユーザーの最終訪問以降の新規投稿/コメント数を掲示板ごとに返す"""
    current_user_id = get_current_user_id(request)
    if not current_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ユーザーIDが見つかりません")

    board_ids = [1, 2, 3, 4, 5, 6]
    results = []
    for board_id in board_ids:
        visit = db.query(models.BoardVisit).filter(
            and_(models.BoardVisit.user_id == current_user_id, models.BoardVisit.board_id == str(board_id))
        ).first()
        last_seen = visit.last_seen if visit else None

        # 新規投稿数
        post_query = db.query(func.count(models.BoardPost.id)).filter(models.BoardPost.board_id == str(board_id))
        if last_seen:
            post_query = post_query.filter(models.BoardPost.created_at > last_seen)
        new_posts = post_query.scalar() or 0

        # 新規コメント数（該当掲示板の投稿に紐づく返信）
        reply_query = db.query(func.count(models.BoardReply.id)).join(
            models.BoardPost, models.BoardReply.post_id == models.BoardPost.id
        ).filter(models.BoardPost.board_id == str(board_id))
        if last_seen:
            reply_query = reply_query.filter(models.BoardReply.created_at > last_seen)
        new_comments = reply_query.scalar() or 0

        results.append({
            "board_id": board_id,
            "new_posts": int(new_posts),
            "new_comments": int(new_comments),
            "last_seen": ensure_jst_aware(last_seen).isoformat() if last_seen else None,
        })

    return {"counts": results}

@router.post("/visit/{board_id}")
def mark_board_visited(board_id: str, request: Request, db: Session = Depends(database.get_db)):
    """掲示板入室時に最終訪問時刻を現在時刻に更新する"""
    current_user_id = get_current_user_id(request)
    if not current_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ユーザーIDが見つかりません")

    visit = db.query(models.BoardVisit).filter(
        and_(models.BoardVisit.user_id == current_user_id, models.BoardVisit.board_id == str(board_id))
    ).first()
    now = models.jst_now()
    if visit:
        visit.last_seen = now
    else:
        visit = models.BoardVisit(user_id=current_user_id, board_id=str(board_id), last_seen=now)
        db.add(visit)
    db.commit()
    return {"message": "ok", "board_id": board_id, "last_seen": ensure_jst_aware(now).isoformat()}
