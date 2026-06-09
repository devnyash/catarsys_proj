from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class ModCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    category: str = Field(..., pattern=r"^(redux|gun_pack|clothes|vehicle|effects|other)$")
    project: str = Field(..., pattern=r"^(gta5rp|majestic|universal)$")
    price: Decimal = Field(default=Decimal("0.00"), ge=0)
    download_url: str = Field(..., min_length=1, max_length=512)
    youtube_url: str | None = Field(None, max_length=512)
    telegram_url: str | None = Field(None, max_length=512)
    is_dangerous: bool = False
    requires_subscription: bool = False
    subscription_channel: str | None = Field(None, max_length=255)


class ModUpdateRequest(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, min_length=1)
    category: str | None = Field(None, pattern=r"^(redux|gun_pack|clothes|vehicle|effects|other)$")
    project: str | None = Field(None, pattern=r"^(gta5rp|majestic|universal)$")
    price: Decimal | None = Field(None, ge=0)
    download_url: str | None = Field(None, min_length=1, max_length=512)
    youtube_url: str | None = Field(None, max_length=512)
    telegram_url: str | None = Field(None, max_length=512)
    is_dangerous: bool | None = None
    requires_subscription: bool | None = None
    subscription_channel: str | None = Field(None, max_length=255)


class ModResponse(BaseModel):
    id: int
    author_id: int
    author_username: str | None = None
    title: str
    description: str
    category: str
    project: str
    price: float = 0.0
    download_url: str
    youtube_url: str | None = None
    telegram_url: str | None = None
    status: str = "draft"
    is_dangerous: bool = False
    requires_subscription: bool = False
    subscription_channel: str | None = None
    rating: float = 0.0
    reviews_count: int = 0
    downloads_count: int = 0
    cover_media_id: int | None = None
    is_pinned: bool = False
    pinned_until: datetime | None = None
    is_deleted: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class ModListResponse(BaseModel):
    items: list[ModResponse]
    next_cursor: str | None = None
    has_more: bool = False


class SearchResponse(BaseModel):
    items: list[ModResponse]
    next_cursor: str | None = None
    has_more: bool = False


class RateRequest(BaseModel):
    score: int = Field(..., ge=1, le=5)
    comment: str | None = Field(None, max_length=1000)
