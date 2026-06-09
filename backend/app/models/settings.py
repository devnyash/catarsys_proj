from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserSettings(Base):
    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), unique=True, nullable=False
    )
    theme: Mapped[str] = mapped_column(
        Enum("light", "dark", "system", name="settings_theme"),
        default="dark",
        nullable=False,
    )
    ui_scale: Mapped[int] = mapped_column(Integer, default=100)
    auto_update: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_app: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_telegram: Mapped[bool] = mapped_column(Boolean, default=False)
    download_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="settings", lazy="selectin")

    def __repr__(self) -> str:
        return f"<UserSettings(id={self.id}, user_id={self.user_id})>"
