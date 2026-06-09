import json
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.mod_repo import ModRepository
from app.repositories.user_repo import UserRepository


class ModService:
    def __init__(self):
        self.mod_repo = ModRepository()
        self.user_repo = UserRepository()

    def _serialize_mod(self, mod) -> dict:
        return {
            "id": mod.id,
            "title": mod.title,
            "description": mod.description,
            "category": mod.category,
            "project": mod.project,
            "author_id": mod.author_id,
            "author_username": mod.author.username if mod.author else None,
            "price": float(mod.price) if mod.price else 0,
            "download_url": mod.download_url,
            "youtube_url": mod.youtube_url,
            "telegram_url": mod.telegram_url,
            "status": mod.status,
            "is_pinned": mod.is_pinned,
            "requires_subscription": mod.requires_subscription,
            "downloads_count": mod.downloads_count,
            "rating": float(mod.rating) if mod.rating else 0,
            "reviews_count": mod.reviews_count,
            "cover_media_id": mod.cover_media_id,
            "created_at": mod.created_at.isoformat() if mod.created_at else None,
            "updated_at": mod.updated_at.isoformat() if mod.updated_at else None,
        }

    async def list_mods(
        self,
        db: AsyncSession,
        cursor: str | None = None,
        category: str | None = None,
        project: str | None = None,
        sort: str = "created_at",
        limit: int = 20,
    ) -> dict:
        mods, has_more = await self.mod_repo.list_paginated(
            db, category=category, project=project, sort=sort, cursor=cursor, limit=limit
        )

        next_cursor = None
        if has_more and mods:
            last = mods[-1]
            sort_val = getattr(last, sort if sort in ("created_at", "downloads_count", "rating", "price", "updated_at") else "created_at")
            if hasattr(sort_val, "isoformat"):
                sort_val = sort_val.isoformat()
            elif hasattr(sort_val, "__float__"):
                sort_val = float(sort_val)
            next_cursor = json.dumps({"value": sort_val, "id": last.id})

        return {
            "success": True,
            "data": {
                "mods": [self._serialize_mod(m) for m in mods],
                "next_cursor": next_cursor,
                "has_more": has_more,
            },
        }

    async def search_mods(
        self,
        db: AsyncSession,
        redis_client,
        query: str,
        cursor: str | None = None,
        limit: int = 20,
    ) -> dict:
        cache_key = f"search:{query}:{cursor}:{limit}"

        # Try Redis cache
        if redis_client:
            try:
                cached = await redis_client.get(cache_key)
                if cached:
                    return json.loads(cached)
            except Exception:
                pass

        mods, has_more = await self.mod_repo.search(db, query, cursor=cursor, limit=limit)

        next_cursor = None
        if has_more and mods:
            last = mods[-1]
            next_cursor = json.dumps({"value": last.id, "id": last.id})

        response_data = {
            "success": True,
            "data": {
                "mods": [self._serialize_mod(m) for m in mods],
                "next_cursor": next_cursor,
                "has_more": has_more,
            },
        }

        # Cache for 5 minutes
        if redis_client:
            try:
                await redis_client.setex(cache_key, 300, json.dumps(response_data))
            except Exception:
                pass

        return response_data

    async def get_mod(self, db: AsyncSession, mod_id: int) -> dict:
        mod = await self.mod_repo.get_by_id(db, mod_id)
        if not mod:
            raise HTTPException(status_code=404, detail={
                "success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}
            })

        result = self._serialize_mod(mod)

        # Get gallery images
        images = await db.execute(
            text("SELECT id, url, sort_order FROM mod_images WHERE mod_id = :mid ORDER BY sort_order ASC"),
            {"mid": mod_id},
        )
        image_rows = images.fetchall()
        result["images"] = [{"id": r.id, "url": r.url, "sort_order": r.sort_order} for r in image_rows]

        return {"success": True, "data": result}

    async def create_mod(self, db: AsyncSession, user_id: int, data: dict) -> dict:
        if data.get("price", 0) < 0:
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "INVALID_PRICE", "message": "Price cannot be negative"}
            })

        mod = await self.mod_repo.create(
            db,
            user_id=user_id,
            title=data["title"],
            description=data["description"],
            category=data["category"],
            project=data["project"],
            price=data.get("price", 0),
            download_url=data.get("download_url", ""),
            requires_subscription=data.get("requires_subscription", False),
            subscription_channel=data.get("subscription_channel"),
            youtube_url=data.get("youtube_url"),
            telegram_url=data.get("telegram_url"),
            status="pending",
        )
        await db.commit()

        return {"success": True, "data": {"id": mod.id, "message": "Mod created and pending moderation"}}

    async def update_mod(self, db: AsyncSession, user_id: int, mod_id: int, data: dict) -> dict:
        mod = await self.mod_repo.get_by_id_include_deleted(db, mod_id)
        if not mod or mod.is_deleted:
            raise HTTPException(status_code=404, detail={
                "success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}
            })
        if mod.author_id != user_id:
            raise HTTPException(status_code=403, detail={
                "success": False, "error": {"code": "FORBIDDEN", "message": "Only the author can update this mod"}
            })

        allowed_fields = {
            "title", "description", "category", "project", "download_url",
            "youtube_url", "telegram_url", "price", "requires_subscription",
            "subscription_channel",
        }
        updates = {k: v for k, v in data.items() if k in allowed_fields and v is not None}

        if "price" in updates and updates["price"] < 0:
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "INVALID_PRICE", "message": "Price cannot be negative"}
            })

        if updates:
            await self.mod_repo.update(db, mod_id, **updates)
            await db.commit()

        return {"success": True, "data": {"message": "Mod updated"}}

    async def delete_mod(self, db: AsyncSession, user_id: int, mod_id: int) -> dict:
        mod = await self.mod_repo.get_by_id_include_deleted(db, mod_id)
        if not mod or mod.is_deleted:
            raise HTTPException(status_code=404, detail={
                "success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}
            })

        user = await self.user_repo.get_by_id(db, user_id)
        is_admin = user and user.role in ("admin", "superadmin", "moderator")

        if mod.author_id != user_id and not is_admin:
            raise HTTPException(status_code=403, detail={
                "success": False, "error": {"code": "FORBIDDEN", "message": "Not authorized to delete this mod"}
            })

        await self.mod_repo.soft_delete(db, mod_id)
        await db.commit()

        return {"success": True, "data": {"message": "Mod deleted"}}

    async def request_download(self, db: AsyncSession, user_id: int, mod_id: int) -> dict:
        mod = await self.mod_repo.get_by_id(db, mod_id)
        if not mod:
            raise HTTPException(status_code=404, detail={
                "success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}
            })
        if mod.status != "approved":
            raise HTTPException(status_code=403, detail={
                "success": False, "error": {"code": "MOD_NOT_AVAILABLE", "message": "Mod is not available for download"}
            })

        # Author can download for free
        if mod.author_id == user_id:
            return {"success": True, "data": {"download_url": mod.download_url}}

        # Check if purchased
        if mod.price > 0 or mod.requires_subscription:
            purchased = await self.mod_repo.user_has_access(db, user_id, mod_id)
            if purchased:
                return {"success": True, "data": {"download_url": mod.download_url}}

            subscription = await db.execute(
                text("SELECT id FROM subscriptions WHERE user_id = :uid AND mod_id = :mid AND expires_at > NOW()"),
                {"uid": user_id, "mid": mod_id},
            )
            if subscription.scalar():
                return {"success": True, "data": {"download_url": mod.download_url}}

            if mod.requires_subscription:
                raise HTTPException(status_code=402, detail={
                    "success": False, "error": {"code": "SUBSCRIPTION_REQUIRED", "message": "Active subscription required"}
                })
            if mod.price > 0:
                raise HTTPException(status_code=402, detail={
                    "success": False, "error": {"code": "NOT_PURCHASED", "message": "You must purchase this mod before downloading"}
                })

        # Free mod - track download
        await db.execute(
            text("INSERT INTO downloads (user_id, mod_id, created_at) VALUES (:uid, :mid, NOW()) ON CONFLICT DO NOTHING"),
            {"uid": user_id, "mid": mod_id},
        )
        await self.mod_repo.increment_downloads(db, mod_id)
        await db.commit()

        return {"success": True, "data": {"download_url": mod.download_url}}

    async def rate_mod(self, db: AsyncSession, user_id: int, mod_id: int, score: int, comment: str | None = None) -> dict:
        mod = await self.mod_repo.get_by_id(db, mod_id)
        if not mod:
            raise HTTPException(status_code=404, detail={
                "success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}
            })
        if mod.author_id == user_id:
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "CANNOT_RATE_OWN", "message": "You cannot rate your own mod"}
            })
        if score < 1 or score > 5:
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "INVALID_RATING", "message": "Rating must be between 1 and 5"}
            })

        # Check access
        has_access = await self.mod_repo.user_has_access(db, user_id, mod_id)
        if not has_access:
            has_download = await db.execute(
                text("SELECT 1 FROM downloads WHERE user_id = :uid AND mod_id = :mid"),
                {"uid": user_id, "mid": mod_id},
            )
            if not has_download.scalar():
                raise HTTPException(status_code=403, detail={
                    "success": False, "error": {"code": "NO_ACCESS", "message": "You must download or purchase this mod before rating"}
                })

        await self.mod_repo.upsert_review(db, user_id, mod_id, score, comment)

        avg, cnt = await self.mod_repo.recalc_rating(db, mod_id)
        await db.commit()

        return {
            "success": True,
            "data": {
                "message": "Rating submitted",
                "average_rating": float(avg),
                "rating_count": cnt,
            },
        }

    async def toggle_favorite(self, db: AsyncSession, user_id: int, mod_id: int) -> dict:
        mod = await self.mod_repo.get_by_id(db, mod_id)
        if not mod:
            raise HTTPException(status_code=404, detail={
                "success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}
            })

        is_favorited = await self.mod_repo.toggle_favorite(db, user_id, mod_id)
        await db.commit()

        return {"success": True, "data": {"favorited": is_favorited}}
