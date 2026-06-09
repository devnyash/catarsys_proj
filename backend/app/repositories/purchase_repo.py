from decimal import Decimal

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.purchase import Purchase


class PurchaseRepository:
    async def get_by_id(self, db: AsyncSession, purchase_id: int) -> Purchase | None:
        result = await db.execute(select(Purchase).where(Purchase.id == purchase_id))
        return result.scalar_one_or_none()

    async def get_by_user_and_mod(self, db: AsyncSession, user_id: int, mod_id: int) -> Purchase | None:
        result = await db.execute(
            select(Purchase).where(
                Purchase.user_id == user_id, Purchase.mod_id == mod_id
            )
        )
        return result.scalar_one_or_none()

    async def user_has_purchased(self, db: AsyncSession, user_id: int, mod_id: int) -> bool:
        result = await db.execute(
            select(Purchase.id).where(
                Purchase.user_id == user_id, Purchase.mod_id == mod_id
            )
        )
        return result.scalar() is not None

    async def create(self, db: AsyncSession, user_id: int, mod_id: int, amount_paid: Decimal, promo_id: int | None = None) -> Purchase:
        purchase = Purchase(
            user_id=user_id,
            mod_id=mod_id,
            amount_paid=amount_paid,
            promo_id=promo_id,
        )
        db.add(purchase)
        await db.flush()
        await db.refresh(purchase)
        return purchase

    async def list_by_user(
        self,
        db: AsyncSession,
        user_id: int,
        cursor: int | None = None,
        limit: int = 20,
    ) -> tuple[list[Purchase], bool]:
        query = select(Purchase).where(Purchase.user_id == user_id)
        if cursor:
            query = query.where(Purchase.id < cursor)
        query = query.order_by(Purchase.created_at.desc(), Purchase.id.desc()).limit(limit + 1)

        result = await db.execute(query)
        rows = result.scalars().all()
        has_more = len(rows) > limit
        if has_more:
            rows = rows[:limit]
        return list(rows), has_more

    async def total_purchases(self, db: AsyncSession) -> int:
        result = await db.execute(select(func.count(Purchase.id)))
        return result.scalar() or 0

    async def total_revenue(self, db: AsyncSession) -> Decimal:
        result = await db.execute(select(func.coalesce(func.sum(Purchase.amount_paid), 0)))
        return Decimal(str(result.scalar()))
