import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from pydantic import BaseModel, field_validator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/payments", tags=["payments"])


class DepositRequest(BaseModel):
    amount: float
    payment_method: str = "card"


class WithdrawRequest(BaseModel):
    amount: float
    method: str
    address: str


class CheckoutItem(BaseModel):
    mod_id: int
    type: str = "purchase"


class CartCheckoutRequest(BaseModel):
    items: list[CheckoutItem]
    promo_code: str | None = None


CURSOR_PAGE_SIZE = 20


@router.post("/deposit", status_code=status.HTTP_201_CREATED)
async def create_deposit(req: DepositRequest, user_id: int = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if req.amount < 10:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "MINIMUM_AMOUNT", "message": "Minimum deposit amount is 10"}})
    if req.amount > 100000:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "MAXIMUM_AMOUNT", "message": "Maximum deposit amount is 100000"}})

    payment_id = f"dep_{uuid.uuid4().hex[:16]}"

    result = await db.execute(
        text("""
            INSERT INTO transactions (user_id, type, amount, status, payment_method, payment_id, description, created_at)
            VALUES (:uid, 'deposit', :amount, 'pending', :method, :pid, 'Deposit', NOW())
            RETURNING id
        """),
        {"uid": user_id, "amount": req.amount, "method": req.payment_method, "pid": payment_id},
    )
    tx_id = result.scalar()
    await db.commit()

    payment_url = f"https://payment.platega.com/pay/{payment_id}"

    return {
        "success": True,
        "data": {
            "transaction_id": tx_id,
            "payment_id": payment_id,
            "amount": req.amount,
            "payment_url": payment_url,
            "qr_code": f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={payment_url}",
        },
    }


@router.post("/webhook")
async def payment_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.json()
    payment_id = body.get("payment_id")
    status_val = body.get("status")
    amount = body.get("amount")

    if not payment_id or not status_val:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "INVALID_PAYLOAD", "message": "Invalid webhook payload"}})

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
        await db.execute(
            text("UPDATE users SET balance = balance + :amount WHERE id = :uid"),
            {"amount": tx_row.amount, "uid": tx_row.user_id},
        )
    elif status_val == "failed":
        await db.execute(
            text("UPDATE transactions SET status = 'failed' WHERE id = :tid"),
            {"tid": tx_row.id},
        )

    await db.commit()

    return {"success": True, "data": {"message": "Webhook processed"}}


@router.get("/transactions")
async def get_transactions(
    cursor: int | None = Query(None),
    limit: int = Query(CURSOR_PAGE_SIZE, ge=1, le=100),
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conditions = ["t.user_id = :uid"]
    params = {"uid": user_id}

    if cursor:
        conditions.append("t.id < :cursor")
        params["cursor"] = cursor

    where = " AND ".join(conditions)
    query = text(f"""
        SELECT t.id, t.type, t.amount, t.status, t.payment_method, t.payment_id, t.description, t.created_at
        FROM transactions t
        WHERE {where}
        ORDER BY t.created_at DESC, t.id DESC
        LIMIT :limit
    """)
    params["limit"] = limit + 1

    result = await db.execute(query, params)
    rows = result.fetchall()

    has_more = len(rows) > limit
    if has_more:
        rows = rows[:limit]

    transactions = [
        {
            "id": r.id,
            "type": r.type,
            "amount": float(r.amount),
            "status": r.status,
            "payment_method": r.payment_method,
            "payment_id": r.payment_id,
            "description": r.description,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]

    return {
        "success": True,
        "data": {
            "transactions": transactions,
            "next_cursor": rows[-1].id if has_more and rows else None,
            "has_more": has_more,
        },
    }


@router.post("/withdraw", status_code=status.HTTP_201_CREATED)
async def withdraw(req: WithdrawRequest, user_id: int = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if req.amount < 100:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "MINIMUM_WITHDRAWAL", "message": "Minimum withdrawal amount is 100"}})

    if req.method not in ("card", "TON", "TRC20", "USDT"):
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "INVALID_METHOD", "message": "Invalid withdrawal method"}})

    if not req.address or len(req.address) < 5:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "INVALID_ADDRESS", "message": "Invalid withdrawal address"}})

    user = await db.execute(
        text("SELECT id, balance FROM users WHERE id = :uid"),
        {"uid": user_id},
    )
    user_row = user.one()
    if float(user_row.balance) < req.amount:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "INSUFFICIENT_BALANCE", "message": "Insufficient balance"}})

    result = await db.execute(
        text("""
            INSERT INTO withdrawal_requests (user_id, amount, method, address, status, created_at)
            VALUES (:uid, :amount, :method, :addr, 'pending', NOW())
            RETURNING id
        """),
        {"uid": user_id, "amount": req.amount, "method": req.method, "addr": req.address},
    )
    withdrawal_id = result.scalar()

    await db.execute(
        text("UPDATE users SET balance = balance - :amount WHERE id = :uid"),
        {"amount": req.amount, "uid": user_id},
    )
    await db.execute(
        text("""
            INSERT INTO transactions (user_id, type, amount, status, payment_method, description, created_at)
            VALUES (:uid, 'withdrawal', :amount, 'pending', :method, 'Withdrawal request', NOW())
        """),
        {"uid": user_id, "amount": req.amount, "method": req.method},
    )
    await db.commit()

    return {
        "success": True,
        "data": {
            "withdrawal_id": withdrawal_id,
            "amount": req.amount,
            "method": req.method,
            "status": "pending",
        },
    }


@router.post("/cart/checkout")
async def cart_checkout(req: CartCheckoutRequest, user_id: int = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not req.items:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "EMPTY_CART", "message": "Cart is empty"}})

    total = 0.0
    items_to_process = []
    discount = 0.0

    for item in req.items:
        mod = await db.execute(
            text("SELECT id, title, price, author_id, deleted_at, status FROM mods WHERE id = :mid"),
            {"mid": item.mod_id},
        )
        mod_row = mod.one_or_none()
        if not mod_row or mod_row.deleted_at:
            raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "MOD_NOT_FOUND", "message": f"Mod {item.mod_id} not found"}})
        if mod_row.status != "approved":
            raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "MOD_NOT_AVAILABLE", "message": f"Mod '{mod_row.title}' is not available"}})
        if mod_row.author_id == user_id:
            raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "OWN_MOD", "message": f"Cannot purchase your own mod '{mod_row.title}'"}})

        existing = await db.execute(
            text("SELECT id FROM purchases WHERE user_id = :uid AND mod_id = :mid"),
            {"uid": user_id, "mid": item.mod_id},
        )
        if existing.scalar():
            raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "ALREADY_PURCHASED", "message": f"Mod '{mod_row.title}' already purchased"}})

        items_to_process.append(mod_row)
        total += float(mod_row.price)

    if req.promo_code:
        promo = await db.execute(
            text("SELECT id, discount_percent, max_uses, used_count, expires_at FROM promo_codes WHERE code = :code"),
            {"code": req.promo_code},
        )
        promo_row = promo.one_or_none()
        if not promo_row:
            raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "INVALID_PROMO", "message": "Invalid promo code"}})
        if promo_row.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "PROMO_EXPIRED", "message": "Promo code expired"}})
        if promo_row.used_count >= promo_row.max_uses:
            raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "PROMO_EXHAUSTED", "message": "Promo code has reached max uses"}})
        discount = total * (promo_row.discount_percent / 100)

    final_amount = total - discount
    if final_amount < 0:
        final_amount = 0

    if final_amount > 0:
        user = await db.execute(
            text("SELECT balance FROM users WHERE id = :uid"),
            {"uid": user_id},
        )
        user_balance = float(user.scalar())
        if user_balance < final_amount:
            raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "INSUFFICIENT_BALANCE", "message": f"Insufficient balance. Need {final_amount:.2f}, have {user_balance:.2f}"}})

        await db.execute(
            text("UPDATE users SET balance = balance - :amount WHERE id = :uid"),
            {"amount": final_amount, "uid": user_id},
        )

    for mod_row in items_to_process:
        price = float(mod_row.price)
        await db.execute(
            text("INSERT INTO purchases (user_id, mod_id, amount, created_at) VALUES (:uid, :mid, :amount, NOW())"),
            {"uid": user_id, "mid": mod_row.id, "amount": price},
        )
        if price > 0:
            author_cut = price * 0.95
            await db.execute(
                text("UPDATE users SET balance = balance + :cut WHERE id = :uid"),
                {"cut": author_cut, "uid": mod_row.author_id},
            )
            await db.execute(
                text("""
                    INSERT INTO transactions (user_id, type, amount, status, payment_method, description, created_at)
                    VALUES (:uid, 'purchase', :amount, 'completed', 'balance', :desc, NOW())
                """),
                {"uid": user_id, "amount": price, "desc": f"Purchase '{mod_row.title}'"},
            )

    if req.promo_code and discount > 0:
        await db.execute(
            text("UPDATE promo_codes SET used_count = used_count + 1 WHERE code = :code"),
            {"code": req.promo_code},
        )

    await db.execute(
        text("DELETE FROM cart_items WHERE user_id = :uid"),
        {"uid": user_id},
    )
    await db.commit()

    return {
        "success": True,
        "data": {
            "total": total,
            "discount": discount,
            "final_amount": final_amount,
            "items_purchased": len(items_to_process),
        },
    }
