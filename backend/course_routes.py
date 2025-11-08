from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
import models, schemas, database
from board_routes import get_current_user_id, get_user_by_id, get_or_create_anonymous_name, ensure_jst_aware, is_admin_user

router = APIRouter(prefix="/courses", tags=["courses"])

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/summaries", response_model=List[schemas.CourseSummaryResponse])
def list_summaries(
    request: Request,
    department: str = "", 
    year_semester: str = "", 
    grade_level: str = "",
    grade_score: str = "",
    difficulty_level: str = "",
    q: str = "", 
    limit: int = 50, 
    db: Session = Depends(get_db)
):
    try:
        # データベース接続確認
        print(f"🔍 データベース接続確認: {db}")
        
        # CourseSummaryテーブルの存在確認
        if not hasattr(models, 'CourseSummary'):
            print("❌ CourseSummaryモデルが存在しません")
            raise HTTPException(status_code=500, detail="CourseSummaryモデルが見つかりません")
        
        # テーブルが存在するか確認
        try:
            # まず基本的なクエリを試す
            test_query = db.query(models.CourseSummary.id, models.CourseSummary.title, models.CourseSummary.content).first()
            print("✅ CourseSummaryテーブルにアクセス成功")
            
            # 新しいフィールドの存在確認
            try:
                db.query(models.CourseSummary.grade_level).first()
                print("✅ grade_levelフィールドが存在します")
            except Exception as field_error:
                print(f"⚠️ grade_levelフィールドが存在しません: {field_error}")
                
            try:
                db.query(models.CourseSummary.grade_score).first()
                print("✅ grade_scoreフィールドが存在します")
            except Exception as field_error:
                print(f"⚠️ grade_scoreフィールドが存在しません: {field_error}")
                
            try:
                db.query(models.CourseSummary.difficulty_level).first()
                print("✅ difficulty_levelフィールドが存在します")
            except Exception as field_error:
                print(f"⚠️ difficulty_levelフィールドが存在しません: {field_error}")
                
        except Exception as table_error:
            print(f"❌ CourseSummaryテーブルアクセスエラー: {table_error}")
            raise HTTPException(status_code=500, detail=f"CourseSummaryテーブルにアクセスできません: {str(table_error)}")
        
        query = db.query(models.CourseSummary)
        if department:
            query = query.filter(models.CourseSummary.department == department)
        if year_semester:
            query = query.filter(models.CourseSummary.year_semester == year_semester)
        # 新しいフィールドは存在する場合のみフィルタリング
        if grade_level and hasattr(models.CourseSummary, 'grade_level'):
            query = query.filter(models.CourseSummary.grade_level == grade_level)
        if grade_score and hasattr(models.CourseSummary, 'grade_score'):
            query = query.filter(models.CourseSummary.grade_score == grade_score)
        if difficulty_level and hasattr(models.CourseSummary, 'difficulty_level'):
            query = query.filter(models.CourseSummary.difficulty_level == difficulty_level)
        if q:
            like = f"%{q}%"
            query = query.filter((models.CourseSummary.title.like(like)) | (models.CourseSummary.course_name.like(like)) | (models.CourseSummary.instructor.like(like)))
        
        # クエリ実行
        try:
            rows = query.order_by(desc(models.CourseSummary.created_at)).limit(max(1, min(limit, 100))).all()
            print(f"✅ クエリ実行成功: {len(rows)}件のレコードを取得")
        except Exception as query_error:
            print(f"❌ クエリ実行エラー: {query_error}")
            raise HTTPException(status_code=500, detail=f"クエリの実行に失敗しました: {str(query_error)}")
        
        # 現在のユーザーを取得（いいね状態の確認用）
        current_user_id = None
        try:
            current_user_id = get_current_user_id(request) if request else None
            print(f"✅ ユーザーID取得成功: {current_user_id}")
        except Exception as e:
            print(f"⚠️ ユーザーID取得エラー: {e}")
        
        # レスポンス生成
        try:
            result = []
            for r in rows:
                try:
                    # いいね状態の確認
                    is_liked = None
                    if current_user_id and hasattr(models, 'CourseSummaryLike'):
                        try:
                            like_exists = db.query(models.CourseSummaryLike).filter(
                                models.CourseSummaryLike.summary_id == r.id,
                                models.CourseSummaryLike.user_id == current_user_id
                            ).first()
                            is_liked = bool(like_exists)
                        except Exception as like_error:
                            print(f"⚠️ いいね状態確認エラー: {like_error}")
                            is_liked = None
                    can_edit = bool(current_user_id and r.author_id == current_user_id)
                    
                    summary_response = schemas.CourseSummaryResponse(
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
                        grade_level=getattr(r, 'grade_level', None),
                        grade_score=getattr(r, 'grade_score', None),
                        difficulty_level=getattr(r, 'difficulty_level', None),
                        created_at=ensure_jst_aware(r.created_at).isoformat(),
                        is_liked=is_liked,
                        can_edit=can_edit,
                    )
                    result.append(summary_response)
                except Exception as row_error:
                    print(f"⚠️ レコード処理エラー (ID: {r.id}): {row_error}")
                    continue
            
            print(f"✅ レスポンス生成成功: {len(result)}件")
            return result
        except Exception as response_error:
            print(f"❌ レスポンス生成エラー: {response_error}")
            raise HTTPException(status_code=500, detail=f"レスポンスの生成に失敗しました: {str(response_error)}")
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ 授業まとめ取得エラー: {e}")
        print(f"❌ エラー詳細: {error_details}")
        raise HTTPException(status_code=500, detail=f"授業まとめの取得に失敗しました: {str(e)}")

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
        reference_pdf=payload.reference_pdf,
        grade_level=payload.grade_level,
        grade_score=payload.grade_score,
        difficulty_level=payload.difficulty_level,
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
        reference_pdf=row.reference_pdf,
        author_name=row.author_name,
        like_count=row.like_count,
        comment_count=row.comment_count,
        grade_level=row.grade_level,
        grade_score=row.grade_score,
        difficulty_level=row.difficulty_level,
        created_at=ensure_jst_aware(row.created_at).isoformat(),
        is_liked=False,  # 新規作成時はいいねなし
        can_edit=True,
    )

@router.put("/summaries/{summary_id}", response_model=schemas.CourseSummaryResponse)
def update_summary(summary_id: int, payload: schemas.CourseSummaryCreate, request: Request, db: Session = Depends(get_db)):
    """授業まとめの編集（作者のみ）"""
    current_user_id = get_current_user_id(request)
    if not current_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ユーザーIDが見つかりません")
    row = db.query(models.CourseSummary).filter(models.CourseSummary.id == summary_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="まとめが見つかりません")
    if row.author_id != current_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="編集権限がありません")
    # 更新（与えられた項目のみ）
    row.title = payload.title or row.title
    row.course_name = payload.course_name if payload.course_name is not None else row.course_name
    row.instructor = payload.instructor if payload.instructor is not None else row.instructor
    row.department = payload.department if payload.department is not None else row.department
    row.year_semester = payload.year_semester if payload.year_semester is not None else row.year_semester
    row.tags = payload.tags if payload.tags is not None else row.tags
    row.content = payload.content or row.content
    if hasattr(row, 'reference_pdf'):
        row.reference_pdf = payload.reference_pdf if payload.reference_pdf is not None else row.reference_pdf
    # 新しいフィールド
    if hasattr(row, 'grade_level'):
        row.grade_level = payload.grade_level if payload.grade_level is not None else row.grade_level
    if hasattr(row, 'grade_score'):
        row.grade_score = payload.grade_score if payload.grade_score is not None else row.grade_score
    if hasattr(row, 'difficulty_level'):
        row.difficulty_level = payload.difficulty_level if payload.difficulty_level is not None else row.difficulty_level
    row.updated_at = models.jst_now()
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
        reference_pdf=getattr(row, 'reference_pdf', None),
        author_name=row.author_name,
        like_count=row.like_count,
        comment_count=row.comment_count,
        grade_level=getattr(row, 'grade_level', None),
        grade_score=getattr(row, 'grade_score', None),
        difficulty_level=getattr(row, 'difficulty_level', None),
        created_at=ensure_jst_aware(row.created_at).isoformat(),
        is_liked=None,
        can_edit=True,
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

# =====================
# Admin operations
# =====================

@router.delete("/admin/summaries/{summary_id}")
def admin_delete_summary(summary_id: int, request: Request, db: Session = Depends(get_db)):
    current_user_id = get_current_user_id(request)
    if not current_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ユーザーIDが見つかりません")
    user = get_user_by_id(db, current_user_id)
    if not is_admin_user(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="管理者のみが実行できます")
    row = db.query(models.CourseSummary).filter(models.CourseSummary.id == summary_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="まとめが見つかりません")
    db.query(models.CourseSummaryComment).filter(models.CourseSummaryComment.summary_id == summary_id).delete(synchronize_session=False)
    db.delete(row)
    db.commit()
    return {"message": "deleted", "id": summary_id}

@router.delete("/admin/comments/{comment_id}")
def admin_delete_summary_comment(comment_id: int, request: Request, db: Session = Depends(get_db)):
    current_user_id = get_current_user_id(request)
    if not current_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ユーザーIDが見つかりません")
    user = get_user_by_id(db, current_user_id)
    if not is_admin_user(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="管理者のみが実行できます")
    c = db.query(models.CourseSummaryComment).filter(models.CourseSummaryComment.id == comment_id).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="コメントが見つかりません")
    parent = db.query(models.CourseSummary).filter(models.CourseSummary.id == c.summary_id).first()
    if parent and parent.comment_count > 0:
        parent.comment_count -= 1
    db.delete(c)
    db.commit()
    return {"message": "deleted", "id": comment_id}

# =====================
# Like operations
# =====================

@router.post("/summaries/{summary_id}/like")
def toggle_summary_like(summary_id: int, request: Request, db: Session = Depends(get_db)):
    """授業まとめのいいねをトグル"""
    current_user_id = get_current_user_id(request)
    if not current_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ユーザーIDが見つかりません")
    
    # まとめの存在確認
    summary = db.query(models.CourseSummary).filter(models.CourseSummary.id == summary_id).first()
    if not summary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="まとめが見つかりません")
    
    # 既存のいいねを確認
    existing_like = db.query(models.CourseSummaryLike).filter(
        models.CourseSummaryLike.summary_id == summary_id,
        models.CourseSummaryLike.user_id == current_user_id
    ).first()
    
    if existing_like:
        # いいねを削除
        db.delete(existing_like)
        summary.like_count = max(0, summary.like_count - 1)
        is_liked = False
    else:
        # いいねを追加
        new_like = models.CourseSummaryLike(
            summary_id=summary_id,
            user_id=current_user_id
        )
        db.add(new_like)
        summary.like_count += 1
        is_liked = True
    
    db.commit()
    
    return {
        "message": "いいねを更新しました",
        "summary_id": summary_id,
        "like_count": summary.like_count,
        "is_liked": is_liked
    }


