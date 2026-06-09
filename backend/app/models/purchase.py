from decimal import Decimal
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    DateTime,
    DECIMAL as SQLDecimal,
    ForeignKey,
    Integer,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Purchase(Base):
    __tablename__ = "purchases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    mod_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("mods.id"), nullable=False
    )
    amount_paid: Mapped[Decimal] = mapped_column(SQLDecimal(10, 2), nullable=False)
    promo_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("promo_codes.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="purchases", lazy="selectin")
    mod: Mapped["Mod"] = relationship("Mod", back_populates="purchases", lazy="selectin")

    __table_args__ = (
        UniqueConstraint("user_id", "mod_id", name="uq_purchase_user_mod"),
    )

    def __repr__(self) -> str:
        return f"<Purchase(id={self.id}, user_id={self.user_id}, mod_id={self.mod_id})>"
