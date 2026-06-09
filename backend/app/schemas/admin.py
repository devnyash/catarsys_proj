from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.mod import ModResponse


class AdminUserResponse(BaseModel):
    id: int
    email: str
    username: str
    role: str = "user"
    is_verified: bool = False
    is_banned: bool = False
    balance: float = 0.0
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class AdminUserListResponse(BaseModel):
    items: list[AdminUserResponse]
    total: int
    page: int
    per_page: int


class ModerationQueueResponse(BaseModel):
    items: list[ModResponse]
    total: int


class ApproveModRequest(BaseModel):
    pin_days: int | None = Field(None, ge=1, le=365)


class RejectModRequest(BaseModel):
    reason: str = Field(..., min_length=10, max_length=2000)


class BanModRequest(BaseModel):
    reason: str = Field(..., min_length=10, max_length=2000)


class PublishVersionRequest(BaseModel):
    version: str = Field(..., min_length=1, max_length=50)
    download_url: str = Field(..., min_length=1, max_length=512)
    file_size_bytes: int = Field(..., ge=1)
    sha256_hash: str = Field(..., min_length=64, max_length=64)
    is_critical: bool = False
    changelog: list[str] = Field(default_factory=list)


class StatsResponse(BaseModel):
    total_users: int = 0
    total_mods: int = 0
    total_purchases: int = 0
    total_revenue: float = 0.0
    mods_pending_count: int = 0
    active_subscriptions: int = 0
    open_tickets: int = 0
    downloads_today: int = 0
