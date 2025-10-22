from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
import models, schemas, database

router = APIRouter(prefix="/dm", tags=["dm"])

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def resolve_current_user(request: Request, db: Session) -> models.User:
    user = None
    user_id = request.headers.get("X-User-Id")
    if user_id:
        try:
            uid = int(user_id)
            user = db.query(models.User).filter(models.User.id == uid).first()
        except Exception:
            user = None
    if not user:
        dev_email = request.headers.get("X-Dev-Email")
        if dev_email and dev_email.startswith("dev:"):
            dev_email = dev_email[4:]
        if dev_email:
            user = database.get_user_by_email(db, (dev_email or "").strip().lower())
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ユーザーが見つかりません")
    return user

def get_or_create_conversation(db: Session, a: int, b: int) -> models.DMConversation:
    u1, u2 = (a, b) if a < b else (b, a)
    conv = db.query(models.DMConversation).filter(
        models.DMConversation.user1_id == u1,
        models.DMConversation.user2_id == u2,
    ).first()
    if conv:
        return conv
    conv = models.DMConversation(user1_id=u1, user2_id=u2)
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv

def is_blocked(db: Session, blocker_id: int, blocked_id: int) -> bool:
    return db.query(models.DMBlock).filter(
        models.DMBlock.blocker_id == blocker_id,
        models.DMBlock.blocked_id == blocked_id,
    ).first() is not None

@router.get("/conversations", response_model=List[schemas.DMConversationResponse])
def list_conversations(request: Request, db: Session = Depends(get_db)):
    me = resolve_current_user(request, db)
    convs = db.query(models.DMConversation).filter(
        (models.DMConversation.user1_id == me.id) | (models.DMConversation.user2_id == me.id)
    ).order_by(desc(models.DMConversation.updated_at)).limit(100).all()

    responses: List[schemas.DMConversationResponse] = []
    for c in convs:
        partner = c.user2 if c.user1_id == me.id else c.user1
        unread = c.u1_unread if c.user1_id == me.id else c.u2_unread
        responses.append(schemas.DMConversationResponse(
            id=c.id,
            partner_email=partner.email,
            partner_name=partner.anonymous_name,
            last_message=c.last_message,
            last_message_at=c.last_message_at.isoformat() if c.last_message_at else None,
            unread_count=unread or 0,
            created_at=c.created_at.isoformat(),
            updated_at=c.updated_at.isoformat(),
        ))
    return responses

@router.get("/conversations/{conversation_id}/messages", response_model=List[schemas.DMMessageResponse])
def list_messages(conversation_id: int, request: Request, db: Session = Depends(get_db), limit: int = 50):
    me = resolve_current_user(request, db)
    conv = db.query(models.DMConversation).filter(models.DMConversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="会話が見つかりません")
    if me.id not in (conv.user1_id, conv.user2_id):
        raise HTTPException(status_code=403, detail="この会話にアクセスできません")

    q = db.query(models.DMMessage).filter(models.DMMessage.conversation_id == conversation_id)
    q = q.order_by(desc(models.DMMessage.created_at)).limit(max(1, min(limit, 200)))
    rows = q.all()
    rows.reverse()
    res: List[schemas.DMMessageResponse] = []
    for m in rows:
        sender = db.query(models.User).filter(models.User.id == m.sender_id).first()
        res.append(schemas.DMMessageResponse(
            id=m.id,
            conversation_id=conversation_id,
            sender_email=sender.email if sender else None,
            content=m.content,
            created_at=m.created_at.isoformat(),
        ))
    return res

@router.post("/conversations", response_model=schemas.DMConversationResponse)
def create_conversation(payload: schemas.DMConversationCreate, request: Request, db: Session = Depends(get_db)):
    me = resolve_current_user(request, db)
    target_user: Optional[models.User] = None
    if payload.partner_user_id:
        target_user = db.query(models.User).filter(models.User.id == payload.partner_user_id).first()
    elif payload.partner_email:
        target_user = database.get_user_by_email(db, payload.partner_email.strip().lower())
    if not target_user:
        raise HTTPException(status_code=404, detail="相手ユーザーが見つかりません")
    if target_user.id == me.id:
        raise HTTPException(status_code=400, detail="自分自身とは会話を作成できません")

    # ブロック相互確認
    if is_blocked(db, blocker_id=target_user.id, blocked_id=me.id) or is_blocked(db, blocker_id=me.id, blocked_id=target_user.id):
        raise HTTPException(status_code=403, detail="ブロック状態のため会話を作成できません")

    conv = get_or_create_conversation(db, me.id, target_user.id)
    partner = target_user
    unread = conv.u1_unread if conv.user1_id == me.id else conv.u2_unread
    return schemas.DMConversationResponse(
        id=conv.id,
        partner_email=partner.email,
        partner_name=partner.anonymous_name,
        last_message=conv.last_message,
        last_message_at=conv.last_message_at.isoformat() if conv.last_message_at else None,
        unread_count=unread or 0,
        created_at=conv.created_at.isoformat(),
        updated_at=conv.updated_at.isoformat(),
    )

@router.post("/messages", response_model=schemas.DMMessageResponse)
def send_message(payload: schemas.DMMessageCreate, request: Request, db: Session = Depends(get_db)):
    me = resolve_current_user(request, db)
    conv = db.query(models.DMConversation).filter(models.DMConversation.id == payload.conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="会話が見つかりません")
    if me.id not in (conv.user1_id, conv.user2_id):
        raise HTTPException(status_code=403, detail="この会話に送信できません")

    partner_id = conv.user2_id if conv.user1_id == me.id else conv.user1_id
    if is_blocked(db, blocker_id=partner_id, blocked_id=me.id):
        raise HTTPException(status_code=403, detail="相手によりブロックされています")

    content = (payload.content or "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="メッセージを入力してください")
    if len(content) > 1000:
        raise HTTPException(status_code=400, detail="メッセージは1000文字以内にしてください")

    msg = models.DMMessage(conversation_id=conv.id, sender_id=me.id, content=content)
    db.add(msg)

    conv.last_message = content[:200]
    conv.last_message_at = models.jst_now()
    if me.id == conv.user1_id:
        conv.u2_unread = (conv.u2_unread or 0) + 1
    else:
        conv.u1_unread = (conv.u1_unread or 0) + 1

    notif = models.Notification(
        user_id=partner_id,
        actor_id=me.id,
        type="dm_message",
        entity_type="dm_conversation",
        entity_id=conv.id,
        title="新しいDM",
        message=content[:120],
    )
    db.add(notif)

    db.commit()
    db.refresh(msg)

    sender = db.query(models.User).filter(models.User.id == me.id).first()
    return schemas.DMMessageResponse(
        id=msg.id,
        conversation_id=conv.id,
        sender_email=sender.email if sender else None,
        content=msg.content,
        created_at=msg.created_at.isoformat(),
    )

@router.post("/conversations/{conversation_id}/read")
def mark_read(conversation_id: int, request: Request, db: Session = Depends(get_db)):
    me = resolve_current_user(request, db)
    conv = db.query(models.DMConversation).filter(models.DMConversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="会話が見つかりません")
    if me.id not in (conv.user1_id, conv.user2_id):
        raise HTTPException(status_code=403, detail="この会話にアクセスできません")
    if me.id == conv.user1_id:
        conv.u1_unread = 0
    else:
        conv.u2_unread = 0
    db.commit()
    return {"message": "ok"}

@router.post("/block")
def block_user(payload: dict, request: Request, db: Session = Depends(get_db)):
    me = resolve_current_user(request, db)
    user_id = int(payload.get("user_id")) if payload and payload.get("user_id") is not None else None
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    if me.id == user_id:
        raise HTTPException(status_code=400, detail="自分自身はブロックできません")
    exists = db.query(models.DMBlock).filter(models.DMBlock.blocker_id == me.id, models.DMBlock.blocked_id == user_id).first()
    if exists:
        return {"message": "already"}
    db.add(models.DMBlock(blocker_id=me.id, blocked_id=user_id))
    db.commit()
    return {"message": "ok"}


