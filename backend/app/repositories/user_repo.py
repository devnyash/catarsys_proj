from decimal import Decimal

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    async def get_by_id(self, db: AsyncSession, user_id: int) -> User | None:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, db: AsyncSession, email: str) -> User | None:
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_username(self, db: AsyncSession, username: str) -> User | None:
        result = await db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    async def email_exists(self, db: AsyncSession, email: str) -> bool:
        result = await db.execute(select(User.id).where(User.email == email))
        return result.scalar() is not None

    async def username_exists(self, db: AsyncSession, username: str) -> bool:
        result = await db.execute(select(User.id).where(User.username == username))
        return result.scalar() is not None

    async def create(self, db: AsyncSession, **kwargs) -> User:
        user = User(**kwargs)
        db.add(user)
        await db.flush()
        await db.refresh(user)
        return user

    async def update(self, db: AsyncSession, user_id: int, **kwargs) -> User | None:
        await db.execute(
            update(User).where(User.id == user_id).values(**kwargs)
        )
        await db.flush()
        return await self.get_by_id(db, user_id)

    async def update_role(self, db: AsyncSession, user_id: int, role: str) -> None:
        await db.execute(
            update(User).where(User.id == user_id).values(role=role)
        )
        await db.flush()

    async def update_ban_status(self, db: AsyncSession, user_id: int, is_banned: bool) -> None:
        await db.execute(
            update(User).where(User.id == user_id).values(is_banned=is_banned)
        )
        await db.flush()

    async def update_balance(self, db: AsyncSession, user_id: int, delta) -> None:
        user = await self.get_by_id(db, user_id)
        if user:
            user.balance = Decimal(str(user.balance)) + Decimal(str(delta))
            await db.flush()

    async def update_avatar_media(self, db: AsyncSession, user_id: int, media_id: int | None) -> None:
        await db.execute(
            update(User).where(User.id == user_id).values(avatar_media_id=media_id)
        )
        await db.flush()

    async def list_paginated(
        self, db: AsyncSession, cursor: int | None = None, limit: int = 20
    ) -> tuple[list[User], bool]:
        query = select(User).order_by(User.id.asc()).limit(limit + 1)
        if cursor:
            query = query.where(User.id > cursor)
        result = await db.execute(query)
        rows = result.scalars().all()
        has_more = len(rows) > limit
        if has_more:
            rows = rows[:limit]
        return list(rows), has_more
