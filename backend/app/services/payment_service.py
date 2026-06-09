import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.user_repo import UserRepository
from app.repositories.purchase_repo import PurchaseRepository
from app.repositories.transaction_repo import TransactionRepository


class PaymentService:
    def __init__(self):
        self.user_repo = UserRepository()
        self.purchase_repo = PurchaseRepository()
        self.tx_repo = TransactionRepository()

    async def create_deposit(self, db: AsyncSession, user_id: int, amount: float, payment_method: str = "card") -> dict:
        if amount < 10:
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "MINIMUM_AMOUNT", "message": "Minimum deposit amount is 10"}
            })
        if amount > 100000:
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "MAXIMUM_AMOUNT", "message": "Maximum deposit amount is 100000"}
            })

        user = await self.user_repo.get_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail={
                "success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}
            })

        payment_id = f"dep_{uuid.uuid4().hex[:16]}"
        tx = await self.tx_repo.create(
            db,
            user_id=user_id,
            type="deposit",
            amount=Decimal(str(amount)),
            description="Deposit via " + payment_method,
            balance_before=user.balance,
            balance_after=user.balance,
        )

        await db.commit()

        payment_url = f"https://payment.platega.com/pay/{payment_id}"

        return {
            "success": True,
            "data": {
                "transaction_id": tx.id,
                "payment_id": payment_id,
                "amount": amount,
                "payment_url": payment_url,
                "qr_code": f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={payment_url}",
            },
        }

    async def process_webhook(self, db: AsyncSession, data: dict) -> dict:
        payment_id = data.get("payment_id")
        status_val = data.get("status")

        if not payment_id or not status_val:
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "INVALID_PAYLOAD", "message": "Invalid webhook payload"}
            })

        tx = await db.execute(
            text("SELECT id, user_id, amount, status FROM transactions WHERE payment_id = :pid"),
            {"pid": payment_id},
        )
        tx_row = tx.one_or_none()
        if not tx_row:
            return {"success": False, "error": {"code": "NOT_FOUND", "message": "Transaction not found"}}

        if tx_row.status != "pending":
            return {"success": True, "data": {"message": "Already processed"}}

        if status_val == "success":
            await db.execute(
                text("UPDATE transactions SET status = 'completed' WHERE id = :tid"),
                {"tid": tx_row.id},
            )
            await self.user_repo.update_balance(db, tx_row.user_id, tx_row.amount)
        elif status_val == "failed":
            await db.execute(
                text("UPDATE transactions SET status = 'failed' WHERE id = :tid"),
                {"tid": tx_row.id},
            )

        await db.commit()

        return {"success": True, "data": {"message": "Webhook processed"}}

    async def get_transactions(
        self,
        db: AsyncSession,
        user_id: int,
        cursor: int | None = None,
        limit: int = 20,
    ) -> dict:
        txs, has_more = await self.tx_repo.list_by_user(db, user_id, cursor=cursor, limit=limit)

        return {
            "success": True,
            "data": {
                "transactions": [
                    {
                        "id": t.id,
                        "type": t.type,
                        "amount": float(t.amount),
                        "description": t.description,
                        "balance_before": float(t.balance_before),
                        "balance_after": float(t.balance_after),
                        "created_at": t.created_at.isoformat() if t.created_at else None,
                    }
                    for t in txs
                ],
                "next_cursor": txs[-1].id if has_more and txs else None,
                "has_more": has_more,
            },
        }

    async def withdraw(self, db: AsyncSession, user_id: int, amount: float, method: str, address: str) -> dict:
        if amount < 100:
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "MINIMUM_WITHDRAWAL", "message": "Minimum withdrawal amount is 100"}
            })
        if method not in ("card", "TON", "TRC20", "USDT"):
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "INVALID_METHOD", "message": "Invalid withdrawal method"}
            })
        if not address or len(address) < 5:
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "INVALID_ADDRESS", "message": "Invalid withdrawal address"}
            })

        user = await self.user_repo.get_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail={
                "success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}
            })
        if float(user.balance) < amount:
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "INSUFFICIENT_BALANCE", "message": "Insufficient balance"}
            })

        result = await db.execute(
            text("""
                INSERT INTO withdrawal_requests (user_id, amount, method, address, status, created_at)
                VALUES (:uid, :amount, :method, :addr, 'pending', NOW())
                RETURNING id
            """),
            {"uid": user_id, "amount": amount, "method": method, "addr": address},
        )
        withdrawal_id = result.scalar()

        await self.user_repo.update_balance(db, user_id, -amount)

        balance_before = user.balance
        balance_after = balance_before - Decimal(str(amount))
        await self.tx_repo.create(
            db,
            user_id=user_id,
            type="withdrawal",
            amount=Decimal(str(amount)),
            description=f"Withdrawal via {method}",
            balance_before=balance_before,
            balance_after=balance_after,
        )
        await db.commit()

        return {
            "success": True,
            "data": {
                "withdrawal_id": withdrawal_id,
                "amount": amount,
                "method": method,
                "status": "pending",
            },
        }

    async def checkout_cart(
        self,
        db: AsyncSession,
        user_id: int,
        item_ids: list[dict],
        promo_code: str | None = None,
    ) -> dict:
        if not item_ids:
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "EMPTY_CART", "message": "Cart is empty"}
            })

        total = Decimal("0.00")
        items_to_process = []
        discount = Decimal("0.00")

        for item in item_ids:
            mod_id = item.get("mod_id")
            if not mod_id:
                continue

            mod_row = await db.execute(
                text("SELECT id, title, price, author_id, status, is_deleted FROM mods WHERE id = :mid"),
                {"mid": mod_id},
            )
            mod = mod_row.one_or_none()
            if not mod or mod.is_deleted:
                raise HTTPException(status_code=404, detail={
                    "success": False, "error": {"code": "MOD_NOT_FOUND", "message": f"Mod {mod_id} not found"}
                })
            if mod.status != "approved":
                raise HTTPException(status_code=400, detail={
                    "success": False, "error": {"code": "MOD_NOT_AVAILABLE", "message": f"Mod '{mod.title}' is not available"}
                })
            if mod.author_id == user_id:
                raise HTTPException(status_code=400, detail={
                    "success": False, "error": {"code": "OWN_MOD", "message": f"Cannot purchase your own mod '{mod.title}'"}
                })

            existing = await self.purchase_repo.get_by_user_and_mod(db, user_id, mod_id)
            if existing:
                raise HTTPException(status_code=400, detail={
                    "success": False, "error": {"code": "ALREADY_PURCHASED", "message": f"Mod '{mod.title}' already purchased"}
                })

            items_to_process.append(mod)
            total += Decimal(str(mod.price or 0))

        if promo_code:
            promo = await db.execute(
                text("SELECT id, discount_percent, max_uses, used_count, expires_at FROM promo_codes WHERE code = :code AND is_active = true"),
                {"code": promo_code},
            )
            promo_row = promo.one_or_none()
            if not promo_row:
                raise HTTPException(status_code=404, detail={
                    "success": False, "error": {"code": "INVALID_PROMO", "message": "Invalid promo code"}
                })
            if promo_row.expires_at and promo_row.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail={
                    "success": False, "error": {"code": "PROMO_EXPIRED", "message": "Promo code expired"}
                })
            if promo_row.max_uses and promo_row.used_count >= promo_row.max_uses:
                raise HTTPException(status_code=400, detail={
                    "success": False, "error": {"code": "PROMO_EXHAUSTED", "message": "Promo code has reached max uses"}
                })
            discount = total * (Decimal(str(promo_row.discount_percent)) / Decimal("100"))

        final_amount = total - discount
        if final_amount < 0:
            final_amount = Decimal("0.00")

        user = await self.user_repo.get_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail={
                "success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}
            })

        if final_amount > 0:
            if user.balance < final_amount:
                raise HTTPException(status_code=400, detail={
                    "success": False, "error": {"code": "INSUFFICIENT_BALANCE", "message": f"Insufficient balance. Need {float(final_amount):.2f}, have {float(user.balance):.2f}"}
                })
            await self.user_repo.update_balance(db, user_id, -final_amount)

        for mod in items_to_process:
            price = Decimal(str(mod.price or 0))
            promo_id = None

            await self.purchase_repo.create(
                db,
                user_id=user_id,
                mod_id=mod.id,
                amount_paid=price,
                promo_id=promo_id,
            )

            if price > 0:
                author_cut = price * Decimal("0.95")
                await self.user_repo.update_balance(db, mod.author_id, author_cut)
                balance_before = user.balance
                balance_after = balance_before - price
                await self.tx_repo.create(
                    db,
                    user_id=user_id,
                    type="purchase",
                    amount=price,
                    description=f"Purchase '{mod.title}'",
                    balance_before=balance_before,
                    balance_after=balance_after,
                )

        if promo_code and discount > 0:
            await db.execute(
                text("UPDATE promo_codes SET used_count = used_count + 1 WHERE code = :code"),
                {"code": promo_code},
            )

        await db.execute(
            text("DELETE FROM cart_items WHERE user_id = :uid"),
            {"uid": user_id},
        )
        await db.commit()

        return {
            "success": True,
            "data": {
                "total": float(total),
                "discount": float(discount),
                "final_amount": float(final_amount),
                "items_purchased": len(items_to_process),
            },
        }
