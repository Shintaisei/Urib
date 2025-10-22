from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
import models, schemas, database
from board_routes import get_current_user_id, get_user_by_id, get_or_create_anonymous_name, ensure_jst_aware

router = APIRouter(prefix="/circles", tags=["circles"])

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/summaries", response_model=List[schemas.CircleSummaryResponse])
def list_summaries(category: str = "", q: str = "", limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(models.CircleSummary)
    if category:
        query = query.filter(models.CircleSummary.category == category)
    if q:
        like = f"%{q}%"
        query = query.filter((models.CircleSummary.title.like(like)) | (models.CircleSummary.circle_name.like(like)))
    rows = query.order_by(desc(models.CircleSummary.created_at)).limit(max(1, min(limit, 100))).all()
    return [
        schemas.CircleSummaryResponse(
            id=r.id,
            title=r.title,
            circle_name=r.circle_name,
            category=r.category,
            activity_days=r.activity_days,
            activity_place=r.activity_place,
            cost=r.cost,
            links=r.links,
            tags=r.tags,
            content=r.content,
            author_name=r.author_name,
            like_count=r.like_count,
            comment_count=r.comment_count,
            created_at=ensure_jst_aware(r.created_at).isoformat(),
        ) for r in rows
    ]

@router.post("/summaries", response_model=schemas.CircleSummaryResponse)
def create_summary(payload: schemas.CircleSummaryCreate, request: Request, db: Session = Depends(get_db)):
    current_user_id = get_current_user_id(request)
    if not current_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ユーザーIDが見つかりません")
    user = get_user_by_id(db, current_user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ユーザーが見つかりません")
    anon = get_or_create_anonymous_name(user, db)
    row = models.CircleSummary(
        title=payload.title or (payload.circle_name or "サークルまとめ"),
        circle_name=payload.circle_name,
        category=payload.category,
        activity_days=payload.activity_days,
        activity_place=payload.activity_place,
        cost=payload.cost,
        links=payload.links,
        tags=payload.tags,
        content=payload.content,
        author_id=user.id,
        author_name=anon,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return schemas.CircleSummaryResponse(
        id=row.id,
        title=row.title,
        circle_name=row.circle_name,
        category=row.category,
        activity_days=row.activity_days,
        activity_place=row.activity_place,
        cost=row.cost,
        links=row.links,
        tags=row.tags,
        content=row.content,
        author_name=row.author_name,
        like_count=row.like_count,
        comment_count=row.comment_count,
        created_at=ensure_jst_aware(row.created_at).isoformat(),
    )

@router.get("/summaries/{summary_id}/comments", response_model=List[schemas.CircleSummaryCommentResponse])
def list_summary_comments(summary_id: int, db: Session = Depends(get_db)):
    rows = db.query(models.CircleSummaryComment).filter(models.CircleSummaryComment.summary_id == summary_id).order_by(models.CircleSummaryComment.created_at.asc()).all()
    return [
        schemas.CircleSummaryCommentResponse(
            id=r.id,
            summary_id=r.summary_id,
            author_name=r.author_name,
            content=r.content,
            created_at=ensure_jst_aware(r.created_at).isoformat(),
        ) for r in rows
    ]

@router.post("/summaries/{summary_id}/comments", response_model=schemas.CircleSummaryCommentResponse)
def add_summary_comment(summary_id: int, payload: schemas.CircleSummaryCommentCreate, request: Request, db: Session = Depends(get_db)):
    current_user_id = get_current_user_id(request)
    if not current_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ユーザーIDが見つかりません")
    user = get_user_by_id(db, current_user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ユーザーが見つかりません")
    summary = db.query(models.CircleSummary).filter(models.CircleSummary.id == summary_id).first()
    if not summary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="まとめが見つかりません")
    anon = get_or_create_anonymous_name(user, db)
    c = models.CircleSummaryComment(summary_id=summary_id, author_id=user.id, author_name=anon, content=payload.content)
    db.add(c)
    summary.comment_count += 1
    # 通知: まとめ作者へ（自分以外）
    try:
        if summary.author_id and summary.author_id != user.id:
            notif = models.Notification(
                user_id=summary.author_id,
                actor_id=user.id,
                type="circle_commented",
                entity_type="circle_summary",
                entity_id=summary.id,
                title="サークルまとめにコメントがありました",
                message=payload.content[:120],
            )
            db.add(notif)
    except Exception:
        pass
    db.commit()
    db.refresh(c)
    return schemas.CircleSummaryCommentResponse(
        id=c.id,
        summary_id=c.summary_id,
        author_name=c.author_name,
        content=c.content,
        created_at=ensure_jst_aware(c.created_at).isoformat(),
    )


