from datetime import datetime
from typing import Optional

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mod_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("mods.id"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    mod: Mapped["Mod"] = relationship("Mod", back_populates="reviews", lazy="selectin")
    user: Mapped["User"] = relationship("User", back_populates="reviews", lazy="selectin")

    __table_args__ = (
        UniqueConstraint("mod_id", "user_id", name="uq_review_mod_user"),
    )

    def __repr__(self) -> str:
        return f"<Review(id={self.id}, mod_id={self.mod_id}, user_id={self.user_id}, score={self.score})>"
