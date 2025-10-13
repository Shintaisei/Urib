from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, not_, or_, extract
from typing import Optional
import re
import models, database

router = APIRouter(prefix="/analytics", tags=["analytics"])

ADMIN_EMAIL_PATTERN = re.compile(r"^master(00|0?[1-9]|[1-2][0-9]|30)@ac\.jp$", re.IGNORECASE)

def is_admin_email(email: Optional[str]) -> bool:
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

@router.post("/event")
async def track_event(request: Request, db: Session = Depends(database.get_db)):
    """汎用イベント記録。master*@ac.jp は集計から除外するため、記録はするが集計側で除外。"""
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
    elif user_id_int:
        user = db.query(models.User).filter(models.User.id == user_id_int).first()
        if user:
            email = (user.email or "").strip().lower()

    json = await request.json()
    event_name = (json.get("event_name") or "").strip()
    properties = json.get("properties")
    path = json.get("path") or request.url.path
    ref = request.headers.get("Referer")
    ua = request.headers.get("User-Agent")
    utm_source = json.get("utm_source")
    utm_medium = json.get("utm_medium")
    utm_campaign = json.get("utm_campaign")

    if not event_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="event_name is required")

    ev = models.AnalyticsEvent(
        user_id=user_id_int,
        email=email,
        event_name=event_name,
        path=path,
        referrer=ref,
        utm_source=utm_source,
        utm_medium=utm_medium,
        utm_campaign=utm_campaign,
        user_agent=ua,
        properties=str(properties) if properties is not None else None,
    )
    db.add(ev)
    db.commit()
    return {"message": "event_tracked"}

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
    ).group_by(models.User.id, models.User.anonymous_name).order_by(func.count(models.BoardPost.id).desc()).limit(10).all()

    # イベント集計（管理者以外）: モデルが未ロードな環境でも500にしない
    events_count = 0
    top_events = []
    if hasattr(models, 'AnalyticsEvent'):
        events_count = db.query(models.AnalyticsEvent).filter(
            models.AnalyticsEvent.created_at >= since,
            or_(models.AnalyticsEvent.email == None, not_(models.AnalyticsEvent.email.like('master%@ac.jp')))
        ).count()

        top_events = db.query(
            models.AnalyticsEvent.event_name,
            func.count(models.AnalyticsEvent.id)
        ).filter(
            models.AnalyticsEvent.created_at >= since,
            or_(models.AnalyticsEvent.email == None, not_(models.AnalyticsEvent.email.like('master%@ac.jp')))
        ).group_by(models.AnalyticsEvent.event_name).order_by(func.count(models.AnalyticsEvent.id).desc()).limit(10).all()

    # 時間帯分布（0-23h）: 方言差を吸収
    # エンジンから確実に方言名を取得
    try:
        dialect_name = getattr(getattr(database.engine, 'dialect', None), 'name', 'sqlite')
    except Exception:
        dialect_name = 'sqlite'
    hour_expr = func.strftime('%H', models.PageView.created_at) if dialect_name == 'sqlite' else extract('hour', models.PageView.created_at)
    h_col = hour_expr.label('h')
    hourly = db.query(
        h_col,
        func.count(models.PageView.id)
    ).filter(
        models.PageView.created_at >= since,
        or_(models.PageView.email == None, not_(models.PageView.email.like('master%@ac.jp')))
    ).group_by(hour_expr).order_by(hour_expr).all()

    return {
        "pv_count": pv_count,
        "top_paths": [{"path": p, "count": c} for p, c in top_paths],
        "top_posters": [{"anonymous_name": n, "count": c} for n, c in top_posters],
        "events_count": events_count,
        "top_events": [{"event_name": n, "count": c} for n, c in top_events],
        "hourly": [{"hour": int((h or '0')), "count": c} for h, c in hourly],
        "since": since.isoformat()
    }
