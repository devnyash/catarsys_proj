from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class DepositRequest(BaseModel):
    amount: Decimal = Field(..., ge=10, le=100000, decimal_places=2)
    payment_method: str = Field(default="card", pattern=r"^(card|crypto|qiwi)$")


class DepositResponse(BaseModel):
    payment_url: str | None = None
    qr_code: str | None = None
    transaction_id: int


class WithdrawRequest(BaseModel):
    amount: Decimal = Field(..., ge=100, decimal_places=2)
    method: str = Field(..., pattern=r"^(card|TON|TRC20|USDT)$")
    wallet: str | None = Field(None, min_length=5)
    card_number: str | None = Field(None, min_length=5)


class CartCheckoutItem(BaseModel):
    mod_id: int


class CartCheckoutRequest(BaseModel):
    item_ids: list[int] = Field(..., min_length=1)
    promo_code: str | None = None


class TransactionResponse(BaseModel):
    id: int
    type: str
    amount: float = 0.0
    description: str | None = None
    balance_before: float = 0.0
    balance_after: float = 0.0
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class TransactionListResponse(BaseModel):
    items: list[TransactionResponse]
    next_cursor: str | None = None
    has_more: bool = False
