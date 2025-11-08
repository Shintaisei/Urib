from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
import models, schemas, database
from board_routes import get_current_user_id, get_user_by_id, get_or_create_anonymous_name, ensure_jst_aware, is_admin_user

router = APIRouter(prefix="/circles", tags=["circles"])

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/summaries", response_model=List[schemas.CircleSummaryResponse])
def list_summaries(category: str = "", q: str = "", limit: int = 50, request: Request = None, db: Session = Depends(get_db)):
    try:
        # データベース接続確認
        print(f"🔍 CircleSummary データベース接続確認: {db}")
        
        # CircleSummaryテーブルの存在確認
        if not hasattr(models, 'CircleSummary'):
            print("❌ CircleSummaryモデルが存在しません")
            raise HTTPException(status_code=500, detail="CircleSummaryモデルが見つかりません")
        
        # テーブルが存在するか確認
        try:
            # まず基本的なクエリを試す
            test_query = db.query(models.CircleSummary.id, models.CircleSummary.title, models.CircleSummary.content).first()
            print("✅ CircleSummaryテーブルにアクセス成功")
        except Exception as table_error:
            print(f"❌ CircleSummaryテーブルアクセスエラー: {table_error}")
            raise HTTPException(status_code=500, detail=f"CircleSummaryテーブルにアクセスできません: {str(table_error)}")
        
        query = db.query(models.CircleSummary)
        if category:
            query = query.filter(models.CircleSummary.category == category)
        if q:
            like = f"%{q}%"
            query = query.filter((models.CircleSummary.title.like(like)) | (models.CircleSummary.circle_name.like(like)))
        
        # クエリ実行
        try:
            rows = query.order_by(desc(models.CircleSummary.created_at)).limit(max(1, min(limit, 100))).all()
            print(f"✅ CircleSummaryクエリ実行成功: {len(rows)}件のレコードを取得")
        except Exception as query_error:
            print(f"❌ CircleSummaryクエリ実行エラー: {query_error}")
            raise HTTPException(status_code=500, detail=f"クエリの実行に失敗しました: {str(query_error)}")
        
        # レスポンス生成
        try:
            result = []
            for r in rows:
                try:
                    # can_edit 判定
                    current_user_id = get_current_user_id(request) if request else None
                    can_edit = bool(current_user_id and r.author_id == current_user_id)
                    summary_response = schemas.CircleSummaryResponse(
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
                        can_edit=can_edit,
                    )
                    result.append(summary_response)
                except Exception as row_error:
                    print(f"⚠️ CircleSummaryレコード処理エラー (ID: {r.id}): {row_error}")
                    continue
            
            print(f"✅ CircleSummaryレスポンス生成成功: {len(result)}件")
            return result
        except Exception as response_error:
            print(f"❌ CircleSummaryレスポンス生成エラー: {response_error}")
            raise HTTPException(status_code=500, detail=f"レスポンスの生成に失敗しました: {str(response_error)}")
            
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ CircleSummary取得エラー: {e}")
        print(f"❌ エラー詳細: {error_details}")
        raise HTTPException(status_code=500, detail=f"サークルまとめの取得に失敗しました: {str(e)}")

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
        can_edit=True,
    )

@router.put("/summaries/{summary_id}", response_model=schemas.CircleSummaryResponse)
def update_circle_summary(summary_id: int, payload: schemas.CircleSummaryCreate, request: Request, db: Session = Depends(get_db)):
    """サークルまとめの編集（作者のみ）"""
    current_user_id = get_current_user_id(request)
    if not current_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ユーザーIDが見つかりません")
    row = db.query(models.CircleSummary).filter(models.CircleSummary.id == summary_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="まとめが見つかりません")
    if row.author_id != current_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="編集権限がありません")
    # 更新
    row.title = payload.title or row.title
    row.circle_name = payload.circle_name if payload.circle_name is not None else row.circle_name
    row.category = payload.category if payload.category is not None else row.category
    row.activity_days = payload.activity_days if payload.activity_days is not None else row.activity_days
    row.activity_place = payload.activity_place if payload.activity_place is not None else row.activity_place
    row.cost = payload.cost if payload.cost is not None else row.cost
    row.links = payload.links if payload.links is not None else row.links
    row.tags = payload.tags if payload.tags is not None else row.tags
    row.content = payload.content or row.content
    row.updated_at = models.jst_now()
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
        can_edit=True,
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
    row = db.query(models.CircleSummary).filter(models.CircleSummary.id == summary_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="まとめが見つかりません")
    db.query(models.CircleSummaryComment).filter(models.CircleSummaryComment.summary_id == summary_id).delete(synchronize_session=False)
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
    c = db.query(models.CircleSummaryComment).filter(models.CircleSummaryComment.id == comment_id).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="コメントが見つかりません")
    parent = db.query(models.CircleSummary).filter(models.CircleSummary.id == c.summary_id).first()
    if parent and parent.comment_count > 0:
        parent.comment_count -= 1
    db.delete(c)
    db.commit()
    return {"message": "deleted", "id": comment_id}
