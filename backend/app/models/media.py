from datetime import datetime
from typing import Optional

from sqlalchemy import (
    DateTime,
    Enum,
    Integer,
    LargeBinary,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Media(Base):
    __tablename__ = "media"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    entity_type: Mapped[str] = mapped_column(
        Enum(
            "user_avatar", "mod_cover", "mod_screenshot", "mod_file",
            name="media_entity_type",
        ),
        nullable=False,
    )
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    mime_type: Mapped[str] = mapped_column(String(127), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    data: Mapped[Optional[bytes]] = mapped_column(LargeBinary, deferred=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<Media(id={self.id}, entity_type={self.entity_type!r}, entity_id={self.entity_id})>"
