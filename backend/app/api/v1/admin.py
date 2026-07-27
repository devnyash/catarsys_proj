from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_admin
from app.models.user import User
from app.api.v1.ws import push_balance_update

router = APIRouter(tags=["admin"])


class BanUserRequest(BaseModel):
    ban: bool = True
    reason: str | None = None


class ChangeRoleRequest(BaseModel):
    role: str


class SetBalanceRequest(BaseModel):
    balance: float


class GrantModRequest(BaseModel):
    mod_id: int
    amount: float = 0


class ApproveModRequest(BaseModel):
    pin: bool = False


class RejectModRequest(BaseModel):
    reason: str


class BanModRequest(BaseModel):
    reason: str


class ChangeTicketStatusRequest(BaseModel):
    status: str


class ReplyTicketRequest(BaseModel):
    message: str


class PublishVersionRequest(BaseModel):
    version: str
    file_url: str
    changelog: str | None = None


PAGE_SIZE = 20


@router.get("/users")
async def list_users(
    cursor: int | None = Query(None),
    limit: int = Query(PAGE_SIZE, ge=1, le=100),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    conditions = []
    params = {}

    if cursor:
        conditions.append("id > :cursor")
        params["cursor"] = cursor

    where = " AND ".join(conditions) if conditions else "1=1"
    query = text(f"""
        SELECT id, email, username, role, balance, is_verified, is_banned, created_at
        FROM users
        WHERE {where}
        ORDER BY id ASC
        LIMIT :limit
    """)
    params["limit"] = limit + 1

    result = await db.execute(query, params)
    rows = result.fetchall()

    has_more = len(rows) > limit
    if has_more:
        rows = rows[:limit]

    users = [
        {
            "id": r.id,
            "email": r.email,
            "username": r.username,
            "role": r.role,
            "balance": float(r.balance) if r.balance else 0,
            "is_verified": r.is_verified,
            "avatar_url": f"/api/v1/media/avatar/{r.id}",
            "is_banned": r.is_banned,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]

    return {
        "success": True,
        "data": {
            "users": users,
            "next_cursor": rows[-1].id if has_more and rows else None,
            "has_more": has_more,
        },
    }


@router.put("/users/{user_id}/ban")
async def ban_user(
    user_id: int,
    req: BanUserRequest,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await db.execute(text("SELECT id, role FROM users WHERE id = :uid"), {"uid": user_id})
    user_row = user.one_or_none()
    if not user_row:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}})
    if user_row.role in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail={"success": False, "error": {"code": "CANNOT_BAN_ADMIN", "message": "Cannot ban another admin"}})

    await db.execute(
        text("UPDATE users SET is_banned = :ban, updated_at = NOW() WHERE id = :uid"),
        {"ban": req.ban, "uid": user_id},
    )
    await db.commit()

    status_text = "banned" if req.ban else "unbanned"
    return {"success": True, "data": {"message": f"User {status_text} successfully"}}


@router.put("/users/{user_id}/role")
async def change_user_role(
    user_id: int,
    req: ChangeRoleRequest,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if req.role not in ("user", "moderator", "admin"):
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "INVALID_ROLE", "message": "Invalid role. Must be: user, moderator, admin"}})

    user = await db.execute(text("SELECT id FROM users WHERE id = :uid"), {"uid": user_id})
    if not user.scalar():
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}})

    await db.execute(
        text("UPDATE users SET role = :role, updated_at = NOW() WHERE id = :uid"),
        {"role": req.role, "uid": user_id},
    )
    await db.commit()

    return {"success": True, "data": {"message": f"User role changed to {req.role}"}}


@router.put("/users/{user_id}/balance")
async def set_user_balance(
    user_id: int,
    req: SetBalanceRequest,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if req.balance < 0:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "INVALID_BALANCE", "message": "Balance cannot be negative"}})

    user = await db.execute(text("SELECT id FROM users WHERE id = :uid"), {"uid": user_id})
    if not user.scalar():
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}})

    await db.execute(
        text("UPDATE users SET balance = :balance, updated_at = NOW() WHERE id = :uid"),
        {"balance": req.balance, "uid": user_id},
    )
    await db.commit()

    # Push real-time balance update via WebSocket
    try:
        await push_balance_update(user_id, float(req.balance))
    except Exception:
        pass  # WS push is best-effort

    return {"success": True, "data": {"message": f"Balance set to {req.balance}"}}


@router.get("/users/{user_id}/purchases")
async def list_user_purchases(
    user_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            SELECT p.id, p.mod_id, m.title AS mod_title, p.amount_paid, p.created_at
            FROM purchases p
            JOIN mods m ON m.id = p.mod_id
            WHERE p.user_id = :uid
            ORDER BY p.created_at DESC
        """),
        {"uid": user_id},
    )
    rows = result.fetchall()
    return {
        "success": True,
        "data": {
            "purchases": [
                {"id": r.id, "modId": r.mod_id, "modTitle": r.mod_title, "amount": float(r.amount_paid), "createdAt": r.created_at.isoformat() if r.created_at else None}
                for r in rows
            ]
        },
    }


@router.post("/users/{user_id}/purchases")
async def grant_mod_access(
    user_id: int,
    body: dict = Body(...),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    mod_id = body.get("mod_id")
    amount = body.get("amount", 0)
    if not mod_id:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "INVALID_INPUT", "message": "mod_id is required"}})

    mod = await db.execute(text("SELECT id, price FROM mods WHERE id = :mid"), {"mid": mod_id})
    if not mod.scalar():
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}})

    existing = await db.execute(
        text("SELECT id FROM purchases WHERE user_id = :uid AND mod_id = :mid"),
        {"uid": user_id, "mid": mod_id},
    )
    if existing.scalar():
        raise HTTPException(status_code=409, detail={"success": False, "error": {"code": "ALREADY_PURCHASED", "message": "User already has access to this mod"}})

    await db.execute(
        text("INSERT INTO purchases (user_id, mod_id, amount_paid, created_at) VALUES (:uid, :mid, :amount, NOW())"),
        {"uid": user_id, "mid": mod_id, "amount": amount},
    )
    await db.commit()

    return {"success": True, "data": {"message": "Access granted"}}


@router.delete("/users/{user_id}/purchases/{mod_id}")
async def revoke_mod_access(
    user_id: int,
    mod_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("DELETE FROM purchases WHERE user_id = :uid AND mod_id = :mid"),
        {"uid": user_id, "mid": mod_id},
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "NOT_FOUND", "message": "Purchase not found"}})
    await db.commit()

    return {"success": True, "data": {"message": "Access revoked"}}


@router.get("/mods/pending")
async def get_moderation_queue(
    cursor: int | None = Query(None),
    limit: int = Query(PAGE_SIZE, ge=1, le=100),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    conditions = ["m.status = 'pending'", "m.deleted_at IS NULL"]
    params = {}

    if cursor:
        conditions.append("m.id < :cursor")
        params["cursor"] = cursor

    where = " AND ".join(conditions)
    query = text(f"""
        SELECT m.id, m.title, m.description, m.category, m.project, m.price, m.download_url, m.youtube_url, m.telegram_url, m.status, m.downloads_count, m.rating, m.reviews_count, m.created_at, m.updated_at,
               u.id AS author_id, u.username AS author_username
        FROM mods m
        JOIN users u ON u.id = m.author_id
        WHERE {where}
        ORDER BY m.created_at ASC, m.id ASC
        LIMIT :limit
    """)
    params["limit"] = limit + 1

    result = await db.execute(query, params)
    rows = result.fetchall()

    has_more = len(rows) > limit
    if has_more:
        rows = rows[:limit]

    # Fetch images for all pending mods
    mod_ids = [r.id for r in rows]
    images_map: dict[int, list[str]] = {}
    if mod_ids:
        images_result = await db.execute(
            text("SELECT mod_id, url FROM mod_images WHERE mod_id IN :mod_ids ORDER BY sort_order ASC"),
            {"mod_ids": mod_ids},
        )
        for img_row in images_result.fetchall():
            images_map.setdefault(img_row.mod_id, []).append(img_row.url)

    mods = [
        {
            "id": r.id,
            "title": r.title,
            "description": r.description,
            "category": r.category,
            "project": r.project,
            "price": float(r.price) if r.price else 0,
            "download_url": r.download_url,
            "youtube_url": r.youtube_url,
            "telegram_url": r.telegram_url,
            "status": r.status,
            "downloads_count": r.downloads_count or 0,
            "rating": float(r.rating) if r.rating else 0,
            "reviews_count": r.reviews_count or 0,
            "author_id": r.author_id,
            "author_username": r.author_username,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            "images": images_map.get(r.id, []),
        }
        for r in rows
    ]

    return {
        "success": True,
        "data": {
            "mods": mods,
            "next_cursor": rows[-1].id if has_more and rows else None,
            "has_more": has_more,
        },
    }


@router.post("/mods/{mod_id}/approve")
async def approve_mod(
    mod_id: int,
    req: ApproveModRequest,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    mod = await db.execute(
        text("SELECT id, author_id, status FROM mods WHERE id = :mid AND deleted_at IS NULL"),
        {"mid": mod_id},
    )
    mod_row = mod.one_or_none()
    if not mod_row:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}})

    await db.execute(
        text("UPDATE mods SET status = 'approved', is_pinned = :pin, updated_at = NOW() WHERE id = :mid"),
        {"pin": req.pin, "mid": mod_id},
    )
    await db.execute(
        text("""
            INSERT INTO notifications (user_id, type, title, body, is_read, created_at)
            VALUES (:uid, 'mod_approved', 'Mod Approved', 'Your mod has been approved and is now live.', false, NOW())
        """),
        {"uid": mod_row.author_id},
    )
    await db.commit()

    return {"success": True, "data": {"message": "Mod approved"}}


@router.post("/mods/{mod_id}/reject")
async def reject_mod(
    mod_id: int,
    req: RejectModRequest,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if not req.reason or len(req.reason.strip()) < 10:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "REASON_REQUIRED", "message": "A detailed rejection reason (min 10 chars) is required"}})

    mod = await db.execute(
        text("SELECT id, author_id, status FROM mods WHERE id = :mid AND deleted_at IS NULL"),
        {"mid": mod_id},
    )
    mod_row = mod.one_or_none()
    if not mod_row:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}})

    await db.execute(
        text("UPDATE mods SET status = 'rejected', updated_at = NOW() WHERE id = :mid"),
        {"mid": mod_id},
    )
    await db.execute(
        text("""
            INSERT INTO notifications (user_id, type, title, body, is_read, payload, created_at)
            VALUES (:uid, 'mod_rejected', 'Mod Rejected', 'Your mod has been rejected.', false, :payload, NOW())
        """),
        {"uid": mod_row.author_id, "payload": req.reason},
    )
    await db.commit()

    return {"success": True, "data": {"message": "Mod rejected"}}


@router.post("/mods/{mod_id}/ban")
async def ban_mod(
    mod_id: int,
    req: BanModRequest,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if not req.reason or len(req.reason.strip()) < 10:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "REASON_REQUIRED", "message": "A detailed ban reason (min 10 chars) is required"}})

    mod = await db.execute(
        text("SELECT id, author_id FROM mods WHERE id = :mid AND deleted_at IS NULL"),
        {"mid": mod_id},
    )
    mod_row = mod.one_or_none()
    if not mod_row:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}})

    await db.execute(
        text("UPDATE mods SET status = 'banned', deleted_at = NOW(), updated_at = NOW() WHERE id = :mid"),
        {"mid": mod_id},
    )
    await db.execute(
        text("""
            INSERT INTO notifications (user_id, type, title, body, is_read, payload, created_at)
            VALUES (:uid, 'mod_banned', 'Mod Banned', 'Your mod has been banned.', false, :payload, NOW())
        """),
        {"uid": mod_row.author_id, "payload": req.reason},
    )
    await db.commit()

    return {"success": True, "data": {"message": "Mod banned"}}


@router.get("/tickets")
async def list_tickets(
    status_filter: str | None = Query(None, alias="status"),
    cursor: int | None = Query(None),
    limit: int = Query(PAGE_SIZE, ge=1, le=100),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    conditions = []
    params = {}

    if status_filter:
        conditions.append("t.status = :status")
        params["status"] = status_filter
    if cursor:
        conditions.append("t.id < :cursor")
        params["cursor"] = cursor

    where = " AND ".join(conditions) if conditions else "1=1"
    query = text(f"""
        SELECT t.id, t.subject, t.message, t.status, t.created_at, t.updated_at,
               u.id AS user_id, u.username AS user_username
        FROM tickets t
        JOIN users u ON u.id = t.user_id
        WHERE {where}
        ORDER BY t.created_at DESC, t.id DESC
        LIMIT :limit
    """)
    params["limit"] = limit + 1

    result = await db.execute(query, params)
    rows = result.fetchall()

    has_more = len(rows) > limit
    if has_more:
        rows = rows[:limit]

    tickets = [
        {
            "id": r.id,
            "subject": r.subject,
            "message": r.message,
            "status": r.status,
            "user_id": r.user_id,
            "user_username": r.user_username,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in rows
    ]

    return {
        "success": True,
        "data": {
            "tickets": tickets,
            "next_cursor": rows[-1].id if has_more and rows else None,
            "has_more": has_more,
        },
    }


@router.put("/tickets/{ticket_id}/status")
async def change_ticket_status(
    ticket_id: int,
    req: ChangeTicketStatusRequest,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    valid_statuses = {"open", "in_progress", "resolved", "closed"}
    if req.status not in valid_statuses:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "INVALID_STATUS", "message": f"Status must be one of: {', '.join(valid_statuses)}"}})

    ticket = await db.execute(text("SELECT id, user_id FROM tickets WHERE id = :tid"), {"tid": ticket_id})
    if not ticket.scalar():
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "TICKET_NOT_FOUND", "message": "Ticket not found"}})

    await db.execute(
        text("UPDATE tickets SET status = :status, updated_at = NOW() WHERE id = :tid"),
        {"status": req.status, "tid": ticket_id},
    )
    await db.commit()

    return {"success": True, "data": {"message": f"Ticket status changed to {req.status}"}}


@router.post("/tickets/{ticket_id}/reply")
async def reply_ticket(
    ticket_id: int,
    req: ReplyTicketRequest,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if not req.message or len(req.message.strip()) < 1:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "MESSAGE_REQUIRED", "message": "Reply message is required"}})

    ticket = await db.execute(
        text("SELECT id, user_id, status FROM tickets WHERE id = :tid"),
        {"tid": ticket_id},
    )
    ticket_row = ticket.one_or_none()
    if not ticket_row:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "TICKET_NOT_FOUND", "message": "Ticket not found"}})

    await db.execute(
        text("""
            INSERT INTO ticket_replies (ticket_id, user_id, message, created_at)
            VALUES (:tid, :uid, :msg, NOW())
        """),
        {"tid": ticket_id, "uid": current_user.id, "msg": req.message},
    )
    if ticket_row.status == "open":
        await db.execute(
            text("UPDATE tickets SET status = 'in_progress', updated_at = NOW() WHERE id = :tid"),
            {"tid": ticket_id},
        )

    await db.execute(
        text("""
            INSERT INTO notifications (user_id, type, title, body, is_read, created_at)
            VALUES (:uid, 'ticket_reply', 'Ticket Reply', 'You have a new reply on your ticket.', false, NOW())
        """),
        {"uid": ticket_row.user_id},
    )
    await db.commit()

    return {"success": True, "data": {"message": "Reply sent"}}


@router.get("/stats")
async def get_platform_stats(
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    async def _count(sql: str) -> int:
        try:
            r = await db.execute(text(sql))
            return r.scalar() or 0
        except Exception:
            return 0

    async def _sum(sql: str) -> float:
        try:
            r = await db.execute(text(sql))
            return float(r.scalar() or 0)
        except Exception:
            return 0.0

    return {
        "success": True,
        "data": {
            "total_users": await _count("SELECT COUNT(*) FROM users"),
            "total_mods": await _count("SELECT COUNT(*) FROM mods WHERE deleted_at IS NULL"),
            "pending_mods": await _count("SELECT COUNT(*) FROM mods WHERE status = 'pending' AND deleted_at IS NULL"),
            "total_purchases": await _count("SELECT COUNT(*) FROM purchases"),
            "total_revenue": await _sum("SELECT COALESCE(SUM(amount_paid), 0) FROM purchases"),
            "active_subscriptions": await _count("SELECT COUNT(*) FROM subscriptions WHERE expires_at > NOW()"),
            "open_tickets": await _count("SELECT COUNT(*) FROM tickets WHERE status IN ('open', 'in_progress')"),
            "downloads_today": await _count("SELECT COUNT(*) FROM downloads WHERE DATE(created_at) = CURDATE()"),
        },
    }


@router.post("/app/versions", status_code=status.HTTP_201_CREATED)
async def publish_version(
    req: PublishVersionRequest,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if not req.version or not req.file_url:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "INVALID_INPUT", "message": "Version and file_url are required"}})

    existing = await db.execute(
        text("SELECT id FROM app_versions WHERE version = :ver"),
        {"ver": req.version},
    )
    if existing.scalar():
        raise HTTPException(status_code=409, detail={"success": False, "error": {"code": "VERSION_EXISTS", "message": "This version already exists"}})

    await db.execute(
        text("""
            INSERT INTO app_versions (version, file_url, changelog, created_at)
            VALUES (:ver, :url, :changelog, NOW())
        """),
        {"ver": req.version, "url": req.file_url, "changelog": req.changelog or ""},
    )
    result = await db.execute(text("SELECT LAST_INSERT_ID()"))
    version_id = result.scalar()
    await db.commit()

    return {
        "success": True,
        "data": {
            "id": version_id,
            "version": req.version,
            "file_url": req.file_url,
            "changelog": req.changelog,
        },
    }
