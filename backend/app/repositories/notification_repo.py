from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


class NotificationRepository:
    async def get_by_id(self, db: AsyncSession, notification_id: int) -> Notification | None:
        result = await db.execute(
            select(Notification).where(Notification.id == notification_id)
        )
        return result.scalar_one_or_none()

    async def create(self, db: AsyncSession, **kwargs) -> Notification:
        notification = Notification(**kwargs)
        db.add(notification)
        await db.flush()
        await db.refresh(notification)
        return notification

    async def get_unread_by_user(self, db: AsyncSession, user_id: int, limit: int = 50) -> list[Notification]:
        result = await db.execute(
            select(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def mark_read(self, db: AsyncSession, notification_id: int, user_id: int) -> None:
        await db.execute(
            update(Notification)
            .where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
            .values(is_read=True)
        )
        await db.flush()

    async def mark_all_read(self, db: AsyncSession, user_id: int) -> None:
        await db.execute(
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.is_read == False,
            )
            .values(is_read=True)
        )
        await db.flush()
