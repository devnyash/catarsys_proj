from sqlalchemy import select, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.media import Media


class MediaRepository:
    async def get_by_id(self, db: AsyncSession, media_id: int) -> Media | None:
        result = await db.execute(select(Media).where(Media.id == media_id))
        return result.scalar_one_or_none()

    async def get_by_entity(
        self, db: AsyncSession, entity_type: str, entity_id: int
    ) -> list[Media]:
        result = await db.execute(
            select(Media)
            .where(Media.entity_type == entity_type, Media.entity_id == entity_id)
            .order_by(Media.sort_order.asc())
        )
        return list(result.scalars().all())

    async def get_first_by_entity(
        self, db: AsyncSession, entity_type: str, entity_id: int
    ) -> Media | None:
        result = await db.execute(
            select(Media)
            .where(Media.entity_type == entity_type, Media.entity_id == entity_id)
            .order_by(Media.sort_order.asc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def create(self, db: AsyncSession, **kwargs) -> Media:
        media = Media(**kwargs)
        db.add(media)
        await db.flush()
        await db.refresh(media)
        return media

    async def delete(self, db: AsyncSession, media_id: int) -> None:
        await db.execute(sa_delete(Media).where(Media.id == media_id))
        await db.flush()

    async def delete_by_entity(self, db: AsyncSession, entity_type: str, entity_id: int) -> None:
        await db.execute(
            sa_delete(Media).where(
                Media.entity_type == entity_type, Media.entity_id == entity_id
            )
        )
        await db.flush()
