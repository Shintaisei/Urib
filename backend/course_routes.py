from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
import models, schemas, database
from board_routes import get_current_user_id, get_user_by_id, get_or_create_anonymous_name, ensure_jst_aware

router = APIRouter(prefix="/courses", tags=["courses"])

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/summaries", response_model=List[schemas.CourseSummaryResponse])
def list_summaries(department: str = "", year_semester: str = "", q: str = "", limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(models.CourseSummary)
    if department:
        query = query.filter(models.CourseSummary.department == department)
    if year_semester:
        query = query.filter(models.CourseSummary.year_semester == year_semester)
    if q:
        like = f"%{q}%"
        query = query.filter((models.CourseSummary.title.like(like)) | (models.CourseSummary.course_name.like(like)) | (models.CourseSummary.instructor.like(like)))
    rows = query.order_by(desc(models.CourseSummary.created_at)).limit(max(1, min(limit, 100))).all()
    return [
        schemas.CourseSummaryResponse(
            id=r.id,
            title=r.title,
            course_name=r.course_name,
            instructor=r.instructor,
            department=r.department,
            year_semester=r.year_semester,
            tags=r.tags,
            content=r.content,
            author_name=r.author_name,
            like_count=r.like_count,
            comment_count=r.comment_count,
            created_at=ensure_jst_aware(r.created_at).isoformat(),
        ) for r in rows
    ]

@router.post("/summaries", response_model=schemas.CourseSummaryResponse)
def create_summary(payload: schemas.CourseSummaryCreate, request: Request, db: Session = Depends(get_db)):
    current_user_id = get_current_user_id(request)
    if not current_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ユーザーIDが見つかりません")
    user = get_user_by_id(db, current_user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ユーザーが見つかりません")
    anon = get_or_create_anonymous_name(user, db)
    row = models.CourseSummary(
        title=payload.title or (payload.course_name or "授業まとめ"),
        course_name=payload.course_name,
        instructor=payload.instructor,
        department=payload.department,
        year_semester=payload.year_semester,
        tags=payload.tags,
        content=payload.content,
        author_id=user.id,
        author_name=anon,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return schemas.CourseSummaryResponse(
        id=row.id,
        title=row.title,
        course_name=row.course_name,
        instructor=row.instructor,
        department=row.department,
        year_semester=row.year_semester,
        tags=row.tags,
        content=row.content,
        author_name=row.author_name,
        like_count=row.like_count,
        comment_count=row.comment_count,
        created_at=ensure_jst_aware(row.created_at).isoformat(),
    )

@router.get("/summaries/{summary_id}/comments", response_model=List[schemas.CourseSummaryCommentResponse])
def list_summary_comments(summary_id: int, db: Session = Depends(get_db)):
    rows = db.query(models.CourseSummaryComment).filter(models.CourseSummaryComment.summary_id == summary_id).order_by(models.CourseSummaryComment.created_at.asc()).all()
    return [
        schemas.CourseSummaryCommentResponse(
            id=r.id,
            summary_id=r.summary_id,
            author_name=r.author_name,
            content=r.content,
            created_at=ensure_jst_aware(r.created_at).isoformat(),
        ) for r in rows
    ]

@router.post("/summaries/{summary_id}/comments", response_model=schemas.CourseSummaryCommentResponse)
def add_summary_comment(summary_id: int, payload: schemas.CourseSummaryCommentCreate, request: Request, db: Session = Depends(get_db)):
    current_user_id = get_current_user_id(request)
    if not current_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ユーザーIDが見つかりません")
    user = get_user_by_id(db, current_user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ユーザーが見つかりません")
    summary = db.query(models.CourseSummary).filter(models.CourseSummary.id == summary_id).first()
    if not summary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="まとめが見つかりません")
    anon = get_or_create_anonymous_name(user, db)
    c = models.CourseSummaryComment(summary_id=summary_id, author_id=user.id, author_name=anon, content=payload.content)
    db.add(c)
    summary.comment_count += 1
    # 通知: まとめ作者へ（自分以外）
    try:
        if summary.author_id and summary.author_id != user.id:
            notif = models.Notification(
                user_id=summary.author_id,
                actor_id=user.id,
                type="course_commented",
                entity_type="course_summary",
                entity_id=summary.id,
                title="授業まとめにコメントがありました",
                message=payload.content[:120],
            )
            db.add(notif)
    except Exception:
        pass
    db.commit()
    db.refresh(c)
    return schemas.CourseSummaryCommentResponse(
        id=c.id,
        summary_id=c.summary_id,
        author_name=c.author_name,
        content=c.content,
        created_at=ensure_jst_aware(c.created_at).isoformat(),
    )


