from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _serialize(row) -> dict:
    return {
        "id": row.id,
        "userId": row.user_id,
        "type": row.type,
        "title": row.title,
        "message": row.body,
        "isRead": row.is_read,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
    }


@router.get("/")
async def list_notifications(
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            SELECT id, user_id, type, title, body, is_read, created_at
            FROM notifications
            WHERE user_id = :uid
            ORDER BY created_at DESC
            LIMIT 50
        """),
        {"uid": user_id},
    )
    rows = result.fetchall()
    notifications = [_serialize(r) for r in rows]
    return {"success": True, "data": {"notifications": notifications}}


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: int,
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("SELECT id, user_id FROM notifications WHERE id = :nid"),
        {"nid": notification_id},
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail={
            "success": False, "error": {"code": "NOT_FOUND", "message": "Notification not found"}
        })
    if row.user_id != user_id:
        raise HTTPException(status_code=403, detail={
            "success": False, "error": {"code": "FORBIDDEN", "message": "Not your notification"}
        })

    await db.execute(
        text("UPDATE notifications SET is_read = true WHERE id = :nid"),
        {"nid": notification_id},
    )
    await db.commit()
    return {"success": True, "data": {"message": "Marked as read"}}


@router.post("/read-all")
async def mark_all_read(
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        text("UPDATE notifications SET is_read = true WHERE user_id = :uid AND is_read = false"),
        {"uid": user_id},
    )
    await db.commit()
    return {"success": True, "data": {"message": "All notifications marked as read"}}
