from decimal import Decimal
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    DECIMAL as SQLDecimal,
    Enum,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    avatar_media_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("media.id"), nullable=True
    )
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_banned: Mapped[bool] = mapped_column(Boolean, default=False)
    role: Mapped[str] = mapped_column(
        Enum("user", "moderator", "admin", "superadmin", name="user_role"),
        default="user",
        nullable=False,
    )
    telegram_id: Mapped[Optional[int]] = mapped_column(Integer, unique=True, nullable=True)
    balance: Mapped[Decimal] = mapped_column(SQLDecimal(12, 2), default=Decimal("0.00"))
    rating: Mapped[Decimal] = mapped_column(SQLDecimal(12, 2), default=Decimal("0.00"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    reviews: Mapped[List["Review"]] = relationship("Review", back_populates="user", lazy="selectin")
    purchases: Mapped[List["Purchase"]] = relationship("Purchase", back_populates="user", lazy="selectin")
    mods: Mapped[List["Mod"]] = relationship("Mod", back_populates="author", lazy="selectin")
    favorites: Mapped[List["Favorite"]] = relationship("Favorite", back_populates="user", lazy="selectin")
    notifications: Mapped[List["Notification"]] = relationship("Notification", back_populates="user", lazy="selectin")
    transactions: Mapped[List["Transaction"]] = relationship("Transaction", back_populates="user", lazy="selectin")
    settings: Mapped[Optional["UserSettings"]] = relationship("UserSettings", back_populates="user", uselist=False, lazy="selectin")
    tickets: Mapped[List["Ticket"]] = relationship("Ticket", back_populates="user", lazy="selectin")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username={self.username!r}, email={self.email!r})>"
