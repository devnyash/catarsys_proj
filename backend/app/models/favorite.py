from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Favorite(Base):
    __tablename__ = "favorites"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    mod_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("mods.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="favorites", lazy="selectin")
    mod: Mapped["Mod"] = relationship("Mod", back_populates="favorites", lazy="selectin")

    __table_args__ = (
        UniqueConstraint("user_id", "mod_id", name="uq_favorite_user_mod"),
    )

    def __repr__(self) -> str:
        return f"<Favorite(id={self.id}, user_id={self.user_id}, mod_id={self.mod_id})>"
