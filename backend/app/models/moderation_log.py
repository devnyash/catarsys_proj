from datetime import datetime
from typing import Optional

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ModModerationLog(Base):
    __tablename__ = "mod_moderation_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mod_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("mods.id"), nullable=False
    )
    moderator_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    action: Mapped[str] = mapped_column(
        Enum(
            "approved", "rejected", "banned", "unbanned",
            "flagged", "reviewed", name="moderation_action",
        ),
        nullable=False,
    )
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    mod: Mapped["Mod"] = relationship("Mod", back_populates="moderation_logs", lazy="selectin")

    def __repr__(self) -> str:
        return f"<ModModerationLog(id={self.id}, action={self.action!r})>"
