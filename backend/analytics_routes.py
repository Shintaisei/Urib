from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, not_, or_
import re
import models, database

router = APIRouter(prefix="/analytics", tags=["analytics"])

ADMIN_EMAIL_PATTERN = re.compile(r"^master([1-9]|[1-2][0-9]|30)@ac\.jp$", re.IGNORECASE)

def is_admin_email(email: str | None) -> bool:
    if not email:
        return False
    return ADMIN_EMAIL_PATTERN.match(email or "") is not None

@router.post("/track")
async def track_page_view(request: Request, db: Session = Depends(database.get_db)):
    """PVを1件記録する（誰でも可）。ヘッダーからuser_id/emailを拾う。"""
    headers = request.headers
    user_id = headers.get("X-User-Id")
    dev_email = headers.get("X-Dev-Email")
    try:
        user_id_int = int(user_id) if user_id else None
    except:
        user_id_int = None

    email = None
    if dev_email:
        email = dev_email.strip().lower()
    else:
        # user_idがあればDBからメールを取得
        if user_id_int:
            user = db.query(models.User).filter(models.User.id == user_id_int).first()
            if user:
                email = (user.email or "").strip().lower()

    body = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}
    path = (body.get("path") if isinstance(body, dict) else None) or request.url.path
    ua = headers.get("User-Agent")

    pv = models.PageView(user_id=user_id_int, email=email, path=path, user_agent=ua)
    db.add(pv)
    db.commit()
    return {"message": "tracked"}

@router.get("/summary")
async def analytics_summary(request: Request, days: int = 7, db: Session = Depends(database.get_db)):
    """管理者専用: 直近days日分のPVと投稿動向（管理者以外）を返す。"""
    # 管理者チェック（X-User-Id または X-Dev-Email）
    user_id = request.headers.get("X-User-Id")
    dev_email = request.headers.get("X-Dev-Email")

    email = None
    if dev_email:
        email = dev_email.strip().lower()
    elif user_id:
        try:
            uid = int(user_id)
        except:
            uid = None
        if uid:
            user = db.query(models.User).filter(models.User.id == uid).first()
            email = (user.email or "").strip().lower() if user else None

    if not is_admin_email(email):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="管理者のみが閲覧できます")

    # 期間フィルタ
    from datetime import timedelta
    since = models.jst_now() - timedelta(days=days)

    # PV合計（管理者以外: master%@ac.jp を除外）
    pv_count = db.query(models.PageView).filter(
        models.PageView.created_at >= since,
        or_(models.PageView.email == None, not_(models.PageView.email.like('master%@ac.jp')))
    ).count()

    # パス別PVトップ
    top_paths = db.query(
        models.PageView.path,
        func.count(models.PageView.id)
    ).filter(
        models.PageView.created_at >= since,
        or_(models.PageView.email == None, not_(models.PageView.email.like('master%@ac.jp')))
    ).group_by(models.PageView.path).order_by(func.count(models.PageView.id).desc()).limit(10).all()

    # 投稿多いユーザー（管理者以外）
    top_posters = db.query(
        models.User.anonymous_name,
        func.count(models.BoardPost.id)
    ).join(models.BoardPost, models.BoardPost.author_id == models.User.id).filter(
        models.BoardPost.created_at >= since,
        or_(models.User.email == None, not_(models.User.email.like('master%@ac.jp')))
    ).group_by(models.User.id).order_by(func.count(models.BoardPost.id).desc()).limit(10).all()

    return {
        "pv_count": pv_count,
        "top_paths": [{"path": p, "count": c} for p, c in top_paths],
        "top_posters": [{"anonymous_name": n, "count": c} for n, c in top_posters],
        "since": since.isoformat()
    }
