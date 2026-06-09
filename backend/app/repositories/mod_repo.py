import json
from datetime import datetime
from decimal import Decimal

from sqlalchemy import select, update, func, text, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.mod import Mod
from app.models.review import Review
from app.models.favorite import Favorite
from app.models.purchase import Purchase


class ModRepository:
    async def get_by_id(self, db: AsyncSession, mod_id: int) -> Mod | None:
        result = await db.execute(
            select(Mod)
            .options(joinedload(Mod.author))
            .where(Mod.id == mod_id, Mod.is_deleted == False)
        )
        return result.unique().scalar_one_or_none()

    async def get_by_id_include_deleted(self, db: AsyncSession, mod_id: int) -> Mod | None:
        result = await db.execute(
            select(Mod).options(joinedload(Mod.author)).where(Mod.id == mod_id)
        )
        return result.unique().scalar_one_or_none()

    async def create(self, db: AsyncSession, user_id: int, **kwargs) -> Mod:
        mod = Mod(author_id=user_id, **kwargs)
        db.add(mod)
        await db.flush()
        await db.refresh(mod)
        return mod

    async def update(self, db: AsyncSession, mod_id: int, **kwargs) -> None:
        kwargs.pop("id", None)
        kwargs.pop("author_id", None)
        await db.execute(
            update(Mod).where(Mod.id == mod_id).values(**kwargs)
        )
        await db.flush()

    async def soft_delete(self, db: AsyncSession, mod_id: int) -> None:
        await db.execute(
            update(Mod)
            .where(Mod.id == mod_id)
            .values(is_deleted=True, deleted_at=func.now(), status="deleted")
        )
        await db.flush()

    async def update_status(self, db: AsyncSession, mod_id: int, status: str) -> None:
        await db.execute(
            update(Mod).where(Mod.id == mod_id).values(status=status)
        )
        await db.flush()

    async def update_is_pinned(self, db: AsyncSession, mod_id: int, is_pinned: bool, pinned_until=None) -> None:
        await db.execute(
            update(Mod).where(Mod.id == mod_id).values(is_pinned=is_pinned, pinned_until=pinned_until)
        )
        await db.flush()

    async def increment_downloads(self, db: AsyncSession, mod_id: int) -> None:
        await db.execute(
            update(Mod)
            .where(Mod.id == mod_id)
            .values(downloads_count=Mod.downloads_count + 1)
        )
        await db.flush()

    async def recalc_rating(self, db: AsyncSession, mod_id: int) -> tuple[Decimal, int]:
        stats = await db.execute(
            select(
                func.count(Review.id).label("cnt"),
                func.coalesce(func.avg(Review.score), 0).label("avg"),
            ).where(Review.mod_id == mod_id)
        )
        row = stats.one()
        avg = round(Decimal(str(row.avg)), 2) if row.avg else Decimal("0.00")
        cnt = row.cnt
        await db.execute(
            update(Mod)
            .where(Mod.id == mod_id)
            .values(rating=avg, reviews_count=cnt)
        )
        await db.flush()
        return avg, cnt

    async def list_paginated(
        self,
        db: AsyncSession,
        category: str | None = None,
        project: str | None = None,
        sort: str = "created_at",
        cursor: str | None = None,
        limit: int = 20,
    ) -> tuple[list[Mod], bool]:
        query = (
            select(Mod)
            .options(joinedload(Mod.author))
            .where(Mod.is_deleted == False, Mod.status == "approved")
        )

        if category:
            query = query.where(Mod.category == category)
        if project:
            query = query.where(Mod.project == project)

        sort_col = getattr(Mod, sort, Mod.created_at)
        order_col = sort_col.desc()

        if cursor:
            try:
                cursor_data = json.loads(cursor)
                cursor_val = cursor_data.get("value")
                cursor_id = cursor_data.get("id")
                if cursor_val is not None and cursor_id is not None:
                    query = query.where(
                        func.row(sort_col, Mod.id) < func.row(cursor_val, cursor_id)
                    )
            except (json.JSONDecodeError, KeyError, TypeError):
                pass

        query = query.order_by(order_col, Mod.id.desc()).limit(limit + 1)

        result = await db.execute(query)
        rows = result.unique().scalars().all()
        has_more = len(rows) > limit
        if has_more:
            rows = rows[:limit]
        return list(rows), has_more

    async def search(
        self,
        db: AsyncSession,
        search_term: str,
        cursor: str | None = None,
        limit: int = 20,
    ) -> tuple[list[Mod], bool]:
        words = search_term.strip().split()
        boolean_term = " ".join(f"+{w}*" for w in words) if words else search_term

        query = (
            select(Mod)
            .options(joinedload(Mod.author))
            .where(
                Mod.is_deleted == False,
                Mod.status == "approved",
                func.match(Mod.title, Mod.description).against(boolean_term, mode="IN BOOLEAN MODE"),
            )
        )

        if cursor:
            try:
                cursor_data = json.loads(cursor)
                cursor_id = cursor_data.get("id")
                if cursor_id is not None:
                    query = query.where(Mod.id < cursor_id)
            except (json.JSONDecodeError, KeyError, TypeError):
                pass

        relevance = func.match(Mod.title, Mod.description).against(boolean_term, mode="IN BOOLEAN MODE").label("relevance")
        query = query.add_columns(relevance)
        query = query.order_by(relevance.desc(), Mod.id.desc()).limit(limit + 1)

        result = await db.execute(query)
        rows = result.unique().all()
        has_more = len(rows) > limit
        if has_more:
            rows = rows[:limit]

        mods = []
        for row in rows:
            mod = row[0]
            mods.append(mod)
        return mods, has_more

    async def get_user_mods(
        self,
        db: AsyncSession,
        user_id: int,
        cursor: int | None = None,
        limit: int = 20,
    ) -> tuple[list[Mod], bool]:
        query = (
            select(Mod)
            .where(
                Mod.author_id == user_id,
                Mod.is_deleted == False,
                Mod.status == "approved",
            )
        )
        if cursor:
            query = query.where(Mod.id < cursor)
        query = query.order_by(Mod.created_at.desc(), Mod.id.desc()).limit(limit + 1)

        result = await db.execute(query)
        rows = result.scalars().all()
        has_more = len(rows) > limit
        if has_more:
            rows = rows[:limit]
        return list(rows), has_more

    # Favorite operations
    async def is_favorited(self, db: AsyncSession, user_id: int, mod_id: int) -> bool:
        result = await db.execute(
            select(Favorite.id).where(
                Favorite.user_id == user_id, Favorite.mod_id == mod_id
            )
        )
        return result.scalar() is not None

    async def toggle_favorite(self, db: AsyncSession, user_id: int, mod_id: int) -> bool:
        existing = await db.execute(
            select(Favorite).where(
                Favorite.user_id == user_id, Favorite.mod_id == mod_id
            )
        )
        fav = existing.scalar_one_or_none()
        if fav:
            await db.delete(fav)
            await db.flush()
            return False
        else:
            db.add(Favorite(user_id=user_id, mod_id=mod_id))
            await db.flush()
            return True

    # Review operations
    async def get_user_review(self, db: AsyncSession, user_id: int, mod_id: int) -> Review | None:
        result = await db.execute(
            select(Review).where(
                Review.user_id == user_id, Review.mod_id == mod_id
            )
        )
        return result.scalar_one_or_none()

    async def upsert_review(self, db: AsyncSession, user_id: int, mod_id: int, score: int, comment: str | None = None) -> Review:
        existing = await self.get_user_review(db, user_id, mod_id)
        if existing:
            existing.score = score
            existing.comment = comment
            await db.flush()
            await db.refresh(existing)
            return existing
        else:
            review = Review(user_id=user_id, mod_id=mod_id, score=score, comment=comment)
            db.add(review)
            await db.flush()
            await db.refresh(review)
            return review

    # User has access (downloaded or purchased)
    async def user_has_access(self, db: AsyncSession, user_id: int, mod_id: int) -> bool:
        result = await db.execute(
            select(Purchase.id).where(
                Purchase.user_id == user_id, Purchase.mod_id == mod_id
            )
        )
        return result.scalar() is not None
