from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_admin

router = APIRouter(prefix="/admin", tags=["admin"])


class BanUserRequest(BaseModel):
    ban: bool = True
    reason: str | None = None


class ChangeRoleRequest(BaseModel):
    role: str


class SetBalanceRequest(BaseModel):
    balance: float


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
    admin_id: int = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    conditions = []
    params = {}

    if cursor:
        conditions.append("id > :cursor")
        params["cursor"] = cursor

    where = " AND ".join(conditions) if conditions else "1=1"
    query = text(f"""
        SELECT id, email, username, role, balance, email_verified, avatar_url, is_banned, created_at
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
            "email_verified": r.email_verified,
            "avatar_url": r.avatar_url,
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
    admin_id: int = Depends(get_current_admin),
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
    admin_id: int = Depends(get_current_admin),
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
    admin_id: int = Depends(get_current_admin),
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

    return {"success": True, "data": {"message": f"Balance set to {req.balance}"}}


@router.get("/mods/pending")
async def get_moderation_queue(
    cursor: int | None = Query(None),
    limit: int = Query(PAGE_SIZE, ge=1, le=100),
    admin_id: int = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    conditions = ["m.status = 'pending'", "m.deleted_at IS NULL"]
    params = {}

    if cursor:
        conditions.append("m.id < :cursor")
        params["cursor"] = cursor

    where = " AND ".join(conditions)
    query = text(f"""
        SELECT m.id, m.title, m.description, m.category, m.project, m.price, m.status, m.created_at,
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

    mods = [
        {
            "id": r.id,
            "title": r.title,
            "description": r.description,
            "category": r.category,
            "project": r.project,
            "price": float(r.price) if r.price else 0,
            "status": r.status,
            "author_id": r.author_id,
            "author_username": r.author_username,
            "created_at": r.created_at.isoformat() if r.created_at else None,
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
    admin_id: int = Depends(get_current_admin),
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
            INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
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
    admin_id: int = Depends(get_current_admin),
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
            INSERT INTO notifications (user_id, type, title, message, is_read, data, created_at)
            VALUES (:uid, 'mod_rejected', 'Mod Rejected', 'Your mod has been rejected.', false, :data, NOW())
        """),
        {"uid": mod_row.author_id, "data": req.reason},
    )
    await db.commit()

    return {"success": True, "data": {"message": "Mod rejected"}}


@router.post("/mods/{mod_id}/ban")
async def ban_mod(
    mod_id: int,
    req: BanModRequest,
    admin_id: int = Depends(get_current_admin),
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
            INSERT INTO notifications (user_id, type, title, message, is_read, data, created_at)
            VALUES (:uid, 'mod_banned', 'Mod Banned', 'Your mod has been banned.', false, :data, NOW())
        """),
        {"uid": mod_row.author_id, "data": req.reason},
    )
    await db.commit()

    return {"success": True, "data": {"message": "Mod banned"}}


@router.get("/tickets")
async def list_tickets(
    status_filter: str | None = Query(None, alias="status"),
    cursor: int | None = Query(None),
    limit: int = Query(PAGE_SIZE, ge=1, le=100),
    admin_id: int = Depends(get_current_admin),
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
    admin_id: int = Depends(get_current_admin),
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
    admin_id: int = Depends(get_current_admin),
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
        {"tid": ticket_id, "uid": admin_id, "msg": req.message},
    )
    if ticket_row.status == "open":
        await db.execute(
            text("UPDATE tickets SET status = 'in_progress', updated_at = NOW() WHERE id = :tid"),
            {"tid": ticket_id},
        )

    await db.execute(
        text("""
            INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
            VALUES (:uid, 'ticket_reply', 'Ticket Reply', 'You have a new reply on your ticket.', false, NOW())
        """),
        {"uid": ticket_row.user_id},
    )
    await db.commit()

    return {"success": True, "data": {"message": "Reply sent"}}


@router.get("/stats")
async def get_platform_stats(
    admin_id: int = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    user_count = await db.execute(text("SELECT COUNT(*) FROM users"))
    mod_count = await db.execute(text("SELECT COUNT(*) FROM mods WHERE deleted_at IS NULL"))
    pending_mods = await db.execute(text("SELECT COUNT(*) FROM mods WHERE status = 'pending' AND deleted_at IS NULL"))
    total_purchases = await db.execute(text("SELECT COUNT(*) FROM purchases"))
    total_revenue = await db.execute(text("SELECT COALESCE(SUM(amount), 0) FROM purchases"))
    active_subscriptions = await db.execute(text("SELECT COUNT(*) FROM subscriptions WHERE expires_at > NOW()"))
    open_tickets = await db.execute(text("SELECT COUNT(*) FROM tickets WHERE status IN ('open', 'in_progress')"))

    downloads_today = await db.execute(
        text("SELECT COUNT(*) FROM downloads WHERE created_at::date = CURRENT_DATE"),
    )

    return {
        "success": True,
        "data": {
            "total_users": user_count.scalar(),
            "total_mods": mod_count.scalar(),
            "pending_mods": pending_mods.scalar(),
            "total_purchases": total_purchases.scalar(),
            "total_revenue": float(total_revenue.scalar()),
            "active_subscriptions": active_subscriptions.scalar(),
            "open_tickets": open_tickets.scalar(),
            "downloads_today": downloads_today.scalar(),
        },
    }


@router.post("/app/versions", status_code=status.HTTP_201_CREATED)
async def publish_version(
    req: PublishVersionRequest,
    admin_id: int = Depends(get_current_admin),
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

    result = await db.execute(
        text("""
            INSERT INTO app_versions (version, file_url, changelog, created_at)
            VALUES (:ver, :url, :changelog, NOW())
            RETURNING id
        """),
        {"ver": req.version, "url": req.file_url, "changelog": req.changelog or ""},
    )
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
