from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.settings import UserSettings


class SettingsRepository:
    async def get_by_user(self, db: AsyncSession, user_id: int) -> UserSettings | None:
        result = await db.execute(
            select(UserSettings).where(UserSettings.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create_default(self, db: AsyncSession, user_id: int) -> UserSettings:
        settings = UserSettings(user_id=user_id)
        db.add(settings)
        await db.flush()
        await db.refresh(settings)
        return settings

    async def upsert(self, db: AsyncSession, user_id: int, **kwargs) -> UserSettings:
        existing = await self.get_by_user(db, user_id)
        if existing:
            for key, value in kwargs.items():
                if hasattr(existing, key):
                    setattr(existing, key, value)
            await db.flush()
            await db.refresh(existing)
            return existing
        else:
            return await self.create_default(db, user_id)
