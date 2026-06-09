from datetime import datetime

from pydantic import BaseModel, Field


class UserProfileResponse(BaseModel):
    id: int
    username: str
    avatar_url: str | None = None
    is_verified: bool = False
    rating: float = 0.0
    followers_count: int = 0
    social_links: dict[str, str] | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class UserModItem(BaseModel):
    id: int
    title: str
    category: str
    project: str
    price: float = 0.0
    cover_media_id: int | None = None
    downloads_count: int = 0
    rating: float = 0.0
    reviews_count: int = 0
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class UserModsResponse(BaseModel):
    items: list[UserModItem]
    next_cursor: str | None = None
    has_more: bool = False
