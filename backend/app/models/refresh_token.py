from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    token: Mapped[str] = mapped_column(Text, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text('0'), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
