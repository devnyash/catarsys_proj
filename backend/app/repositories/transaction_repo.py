from decimal import Decimal

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction


class TransactionRepository:
    async def get_by_id(self, db: AsyncSession, tx_id: int) -> Transaction | None:
        result = await db.execute(select(Transaction).where(Transaction.id == tx_id))
        return result.scalar_one_or_none()

    async def create(self, db: AsyncSession, **kwargs) -> Transaction:
        tx = Transaction(**kwargs)
        db.add(tx)
        await db.flush()
        await db.refresh(tx)
        return tx

    async def list_by_user(
        self,
        db: AsyncSession,
        user_id: int,
        cursor: int | None = None,
        limit: int = 20,
    ) -> tuple[list[Transaction], bool]:
        query = select(Transaction).where(Transaction.user_id == user_id)
        if cursor:
            query = query.where(Transaction.id < cursor)
        query = query.order_by(Transaction.created_at.desc(), Transaction.id.desc()).limit(limit + 1)

        result = await db.execute(query)
        rows = result.scalars().all()
        has_more = len(rows) > limit
        if has_more:
            rows = rows[:limit]
        return list(rows), has_more
