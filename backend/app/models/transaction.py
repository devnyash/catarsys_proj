from decimal import Decimal
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    DateTime,
    DECIMAL as SQLDecimal,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    type: Mapped[str] = mapped_column(
        Enum(
            "deposit", "purchase", "pin_payment",
            "withdrawal", "refund", "earning",
            name="transaction_type",
        ),
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(SQLDecimal(12, 2), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    balance_before: Mapped[Decimal] = mapped_column(SQLDecimal(12, 2), nullable=False)
    balance_after: Mapped[Decimal] = mapped_column(SQLDecimal(12, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="transactions", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Transaction(id={self.id}, type={self.type!r}, amount={self.amount})>"
