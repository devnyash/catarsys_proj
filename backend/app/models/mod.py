from decimal import Decimal
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    DECIMAL as SQLDecimal,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Mod(Base):
    __tablename__ = "mods"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    author_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(
        Enum(
            "redux", "gun_pack", "clothes", "vehicle", "effects", "other",
            name="mod_category",
        ),
        nullable=False,
    )
    project: Mapped[str] = mapped_column(
        Enum("gta5rp", "majestic", "universal", name="mod_project"),
        nullable=False,
    )
    price: Mapped[Decimal] = mapped_column(SQLDecimal(10, 2), default=Decimal("0.00"))
    download_url: Mapped[str] = mapped_column(String(512), nullable=False)
    youtube_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    telegram_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    status: Mapped[str] = mapped_column(
        Enum("draft", "pending", "approved", "rejected", "banned", name="mod_status"),
        default="draft",
        nullable=False,
    )
    is_dangerous: Mapped[bool] = mapped_column(Boolean, default=False)
    requires_subscription: Mapped[bool] = mapped_column(Boolean, default=False)
    subscription_channel: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    rating: Mapped[Decimal] = mapped_column(SQLDecimal(3, 2), default=Decimal("0.00"))
    reviews_count: Mapped[int] = mapped_column(Integer, default=0)
    downloads_count: Mapped[int] = mapped_column(Integer, default=0)
    cover_media_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("media.id"), nullable=True
    )
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    pinned_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    author: Mapped["User"] = relationship("User", back_populates="mods", lazy="selectin")
    reviews: Mapped[List["Review"]] = relationship("Review", back_populates="mod", lazy="selectin")
    purchases: Mapped[List["Purchase"]] = relationship("Purchase", back_populates="mod", lazy="selectin")
    favorites: Mapped[List["Favorite"]] = relationship("Favorite", back_populates="mod", lazy="selectin")
    moderation_logs: Mapped[List["ModModerationLog"]] = relationship(
        "ModModerationLog", back_populates="mod", lazy="selectin"
    )

    __table_args__ = (
        Index("ix_mods_status_category", "status", "category"),
        Index("ix_mods_author_id", "author_id"),
        Index("ix_mods_is_pinned", "is_pinned"),
    )

    def __repr__(self) -> str:
        return f"<Mod(id={self.id}, title={self.title!r}, status={self.status!r})>"
