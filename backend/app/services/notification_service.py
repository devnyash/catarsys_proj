from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.notification_repo import NotificationRepository


class NotificationService:
    def __init__(self):
        self.notification_repo = NotificationRepository()

    async def create_notification(
        self,
        db: AsyncSession,
        user_id: int,
        type: str,
        title: str,
        body: str,
        payload: dict | None = None,
    ) -> dict:
        notification = await self.notification_repo.create(
            db,
            user_id=user_id,
            type=type,
            title=title,
            body=body,
            payload=payload,
            is_read=False,
        )
        await db.commit()

        return {
            "success": True,
            "data": {
                "id": notification.id,
                "type": notification.type,
                "title": notification.title,
                "body": notification.body,
                "payload": notification.payload,
                "is_read": notification.is_read,
                "created_at": notification.created_at.isoformat() if notification.created_at else None,
            },
        }

    async def get_unread(self, db: AsyncSession, user_id: int) -> dict:
        notifications = await self.notification_repo.get_unread_by_user(db, user_id)

        return {
            "success": True,
            "data": {
                "notifications": [
                    {
                        "id": n.id,
                        "type": n.type,
                        "title": n.title,
                        "body": n.body,
                        "payload": n.payload,
                        "created_at": n.created_at.isoformat() if n.created_at else None,
                    }
                    for n in notifications
                ],
                "count": len(notifications),
            },
        }

    async def mark_read(self, db: AsyncSession, notification_id: int, user_id: int) -> dict:
        notification = await self.notification_repo.get_by_id(db, notification_id)
        if not notification or notification.user_id != user_id:
            raise HTTPException(status_code=404, detail={
                "success": False, "error": {"code": "NOT_FOUND", "message": "Notification not found"}
            })

        await self.notification_repo.mark_read(db, notification_id, user_id)
        await db.commit()

        return {"success": True, "data": {"message": "Notification marked as read"}}

    async def mark_all_read(self, db: AsyncSession, user_id: int) -> dict:
        await self.notification_repo.mark_all_read(db, user_id)
        await db.commit()

        return {"success": True, "data": {"message": "All notifications marked as read"}}
