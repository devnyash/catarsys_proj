import json
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from pydantic import BaseModel, field_validator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(tags=["mods"])


class CreateModRequest(BaseModel):
    title: str
    description: str
    category: str
    project: str
    price: float = 0.0
    download_url: str | None = None
    version: str = ""


class UpdateModRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    project: str | None = None
    price: float | None = None
    download_url: str | None = None
    version: str | None = None
    youtube_url: str | None = None
    telegram_url: str | None = None
    is_dangerous: bool | None = None
    requires_subscription: bool | None = None
    subscription_channel: str | None = None


class RateModRequest(BaseModel):
    rating: int

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("Rating must be between 1 and 5")
        return v


CURSOR_PAGE_SIZE = 20


def _serialize_mod(row) -> dict:
    author_username = getattr(row, "author_username", None) or ""
    # Convert filesystem path avatar_url to API URL
    raw_avatar = getattr(row, "author_avatar_url", None) or ""
    if raw_avatar and os.path.isfile(raw_avatar):
        raw_avatar = f"/api/v1/media/avatar/{row.author_id}"
    # Convert filesystem path cover_url to API URL
    raw_cover = getattr(row, "cover_url", None) or ""
    cover_image = None
    if raw_cover and os.path.isfile(raw_cover):
        cover_image = f"/api/v1/media/mod/{row.id}/cover"
    return {
        "id": row.id,
        "title": row.title,
        "description": row.description,
        "category": row.category,
        "project": row.project,
        "authorId": row.author_id,
        "author_username": author_username,
        "author": {
            "id": row.author_id,
            "username": author_username,
            "displayName": getattr(row, "author_display_name", None) or author_username,
            "avatar": raw_avatar,
            "email": "",
            "isVerified": True,
            "isActive": True,
            "isBanned": False,
            "role": "user",
            "balance": 0,
            "followersCount": 0,
            "followingCount": 0,
            "socials": {},
            "createdAt": "",
        },
        "price": float(row.price) if row.price else 0,
        "downloadUrl": row.download_url,
        "status": row.status,
        "isPinned": bool(row.is_pinned),
        "downloadsCount": row.downloads_count,
        "averageRating": float(row.rating) if row.rating else 0,
        "ratingCount": row.reviews_count,
        "tags": [],
        "coverImage": cover_image,
        "isDangerous": bool(getattr(row, "is_dangerous", False)),
        "requiresSubscription": bool(getattr(row, "requires_subscription", False)),
        "galleryImages": [],
        "isDeleted": bool(getattr(row, "is_deleted", False)),
        "version": getattr(row, "version", "") or "",
        "fileSize": "",
        "createdAt": row.created_at.isoformat() if row.created_at else None,
        "updatedAt": row.updated_at.isoformat() if row.updated_at else None,
    }


@router.get("")
async def list_mods(
    cursor: str | None = Query(None),
    category: str | None = Query(None),
    project: str | None = Query(None),
    sort: str = Query("created_at"),
    limit: int = Query(CURSOR_PAGE_SIZE, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    conditions = ["m.deleted_at IS NULL", "m.status IN ('approved', 'archived')"]
    params = {}

    if category:
        conditions.append("m.category = :category")
        params["category"] = category
    if project:
        conditions.append("m.project = :project")
        params["project"] = project
    if cursor:
        try:
            cursor_data = json.loads(cursor)
            cursor_val = cursor_data.get("value")
            cursor_id = cursor_data.get("id")
            if cursor_val is not None and cursor_id is not None:
                sort_options = ("created_at", "downloads_count", "rating", "price", "updated_at")
                sort_col = sort if sort in sort_options else "created_at"
                op = "<" if sort in ("created_at", "updated_at") else "<"
                conditions.append(f"(m.{sort_col}, m.id) < (:cursor_val, :cursor_id)")
                params["cursor_val"] = cursor_val
                params["cursor_id"] = cursor_id
        except (json.JSONDecodeError, KeyError, TypeError):
            pass

    sort_options = ("created_at", "downloads_count", "rating", "price", "updated_at")
    order_col = sort if sort in sort_options else "created_at"
    order_dir = "DESC" if sort in ("created_at", "downloads_count", "rating", "updated_at") else "DESC"

    where_clause = " AND ".join(conditions)
    query = text(
        f"""
        SELECT m.*, u.username AS author_username, u.username AS author_display_name, u.avatar_url AS author_avatar_url
        FROM mods m
        JOIN users u ON u.id = m.author_id
        WHERE {where_clause}
        ORDER BY m.{order_col} {order_dir}, m.id DESC
        LIMIT :limit
        """
    )
    params["limit"] = limit + 1

    result = await db.execute(query, params)
    rows = result.fetchall()

    has_more = len(rows) > limit
    if has_more:
        rows = rows[:limit]

    mods = [_serialize_mod(r) for r in rows]

    # Batch-load gallery images so feed cards can arrow through the gallery
    if mods:
        mod_ids = [m["id"] for m in mods]
        gallery_res = await db.execute(
            text("SELECT id, mod_id, sort_order FROM mod_images WHERE mod_id IN :ids ORDER BY sort_order ASC"),
            {"ids": mod_ids},
        )
        gallery_map: dict[int, list[str]] = {}
        for g in gallery_res.fetchall():
            gallery_map.setdefault(g.mod_id, []).append(
                f"/api/v1/media/mod/{g.mod_id}/gallery/{g.id}"
            )
        for m in mods:
            m["galleryImages"] = gallery_map.get(m["id"], [])

    next_cursor = None
    if has_more and rows:
        last = rows[-1]
        sort_options = ("created_at", "downloads_count", "rating", "price", "updated_at")
        sort_val = getattr(last, sort if sort in sort_options else "created_at")
        if isinstance(sort_val, datetime):
            sort_val = sort_val.isoformat()
        next_cursor = json.dumps({"value": sort_val, "id": last.id})

    return {
        "success": True,
        "data": {
            "mods": mods,
            "next_cursor": next_cursor,
            "has_more": has_more,
        },
    }


@router.get("/search")
async def search_mods(
    q: str = Query(..., min_length=1),
    cursor: str | None = Query(None),
    limit: int = Query(CURSOR_PAGE_SIZE, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    try:
        import redis.asyncio as aioredis
        redis_client = aioredis.Redis.from_url("redis://localhost:6379/0")
        cache_key = f"search:{q}:{cursor}:{limit}"
        cached = await redis_client.get(cache_key)
        if cached:
            await redis_client.aclose()
            return json.loads(cached)
        await redis_client.aclose()
    except Exception:
        pass

    words = q.strip().split()
    mode = "IN BOOLEAN MODE"
    search_term = " ".join(f"+{w}*" for w in words) if words else q

    conditions = ["m.deleted_at IS NULL", "m.status IN ('approved', 'archived')", "MATCH(m.title, m.description) AGAINST(:search_term IN BOOLEAN MODE)"]
    params = {"search_term": search_term}

    if cursor:
        try:
            cursor_data = json.loads(cursor)
            cursor_val = cursor_data.get("value")
            cursor_id = cursor_data.get("id")
            if cursor_val is not None and cursor_id is not None:
                conditions.append("(m.id < :cursor_id)")
                params["cursor_id"] = cursor_id
        except (json.JSONDecodeError, KeyError, TypeError):
            pass

    where_clause = " AND ".join(conditions)
    query = text(
        f"""
        SELECT m.*, u.username AS author_username,
               u.username AS author_display_name, u.avatar_url AS author_avatar_url,
               MATCH(m.title, m.description) AGAINST(:search_term2 IN BOOLEAN MODE) AS relevance
        FROM mods m
        JOIN users u ON u.id = m.author_id
        WHERE {where_clause}
        ORDER BY relevance DESC, m.id DESC
        LIMIT :limit
        """
    )
    params["search_term2"] = search_term
    params["limit"] = limit + 1

    result = await db.execute(query, params)
    rows = result.fetchall()

    has_more = len(rows) > limit
    if has_more:
        rows = rows[:limit]

    mods = [_serialize_mod(r) for r in rows]

    next_cursor = None
    if has_more and rows:
        last = rows[-1]
        next_cursor = json.dumps({"value": last.id, "id": last.id})

    response_data = {"success": True, "data": {"mods": mods, "next_cursor": next_cursor, "has_more": has_more}}

    try:
        import redis.asyncio as aioredis
        redis_client = aioredis.Redis.from_url("redis://localhost:6379/0")
        await redis_client.setex(cache_key, 300, json.dumps(response_data))
        await redis_client.aclose()
    except Exception:
        pass

    return response_data


@router.get("/my")
async def get_my_mods(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("""
            SELECT m.*, u.username AS author_username,
                   u.username AS author_display_name, u.avatar_url AS author_avatar_url
            FROM mods m
            JOIN users u ON u.id = m.author_id
            WHERE m.author_id = :uid AND (m.deleted_at IS NULL OR m.status = 'archived')
            ORDER BY m.updated_at DESC
        """),
        {"uid": current_user.id},
    )
    rows = result.fetchall()
    mods = [_serialize_mod(r) for r in rows]
    return {"success": True, "data": {"mods": mods}}


@router.get("/{mod_id}")
async def get_mod(mod_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""
            SELECT m.*, u.username AS author_username,
                   u.username AS author_display_name, u.avatar_url AS author_avatar_url
            FROM mods m
            JOIN users u ON u.id = m.author_id
            WHERE m.id = :mid AND (m.deleted_at IS NULL OR m.status = 'archived')
        """),
        {"mid": mod_id},
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}})

    images = await db.execute(
        text("SELECT id, url, sort_order FROM mod_images WHERE mod_id = :mid ORDER BY sort_order ASC"),
        {"mid": mod_id},
    )
    image_rows = images.fetchall()

    mod_data = _serialize_mod(row)
    # Convert gallery filesystem paths to API URLs
    gallery_api = []
    # Put cover image first if it exists
    if mod_data.get("coverImage"):
        gallery_api.append(mod_data["coverImage"])
    for r in image_rows:
        if r.url and os.path.isfile(r.url):
            gallery_api.append(f"/api/v1/media/mod/{mod_id}/gallery/{r.id}")
        else:
            gallery_api.append(r.url)
    mod_data["galleryImages"] = gallery_api
    return {
        "success": True,
        "data": mod_data,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_mod(req: CreateModRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if req.price < 0:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "INVALID_PRICE", "message": "Price cannot be negative"}})

    await db.execute(
        text("""
            INSERT INTO mods (title, description, category, project, price, download_url, author_id, status, version, downloads_count, rating, reviews_count, is_pinned, is_dangerous, requires_subscription, is_deleted, created_at, updated_at)
            VALUES (:title, :desc, :cat, :proj, :price, :durl, :author, 'pending', :version, 0, 0.0, 0, 0, 0, 0, 0, NOW(), NOW())
        """),
        {
            "title": req.title,
            "desc": req.description,
            "cat": req.category,
            "proj": req.project,
            "price": req.price,
            "durl": req.download_url or "",
            "author": current_user.id,
            "version": req.version or "",
        },
    )
    result = await db.execute(text("SELECT LAST_INSERT_ID()"))
    mod_id = result.scalar()
    await db.commit()

    return {"success": True, "data": {"id": mod_id, "message": "Mod created and pending moderation"}}


@router.put("/{mod_id}")
async def update_mod(mod_id: int, req: UpdateModRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    mod = await db.execute(
        text("SELECT id, author_id, deleted_at, status FROM mods WHERE id = :mid"),
        {"mid": mod_id},
    )
    mod_row = mod.one_or_none()
    if not mod_row or mod_row.deleted_at:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}})
    if mod_row.author_id != current_user.id:
        raise HTTPException(status_code=403, detail={"success": False, "error": {"code": "FORBIDDEN", "message": "Only the author can update this mod"}})

    updates = {}
    for field in ("title", "description", "category", "project", "version"):
        val = getattr(req, field, None)
        if val is not None:
            updates[field] = val
    if req.download_url is not None:
        updates["download_url"] = req.download_url
    if req.price is not None:
        if req.price < 0:
            raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "INVALID_PRICE", "message": "Price cannot be negative"}})
        updates["price"] = req.price
    if req.is_dangerous is not None:
        updates["is_dangerous"] = 1 if req.is_dangerous else 0
    if req.requires_subscription is not None:
        updates["requires_subscription"] = 1 if req.requires_subscription else 0
    if req.subscription_channel is not None:
        updates["subscription_channel"] = req.subscription_channel
    if req.youtube_url is not None:
        updates["youtube_url"] = req.youtube_url
    if req.telegram_url is not None:
        updates["telegram_url"] = req.telegram_url

    if updates:
        updates["mid"] = mod_id
        set_clause = ", ".join(f"{k} = :{k}" for k in updates if k != "mid")
        await db.execute(
            text(f"UPDATE mods SET {set_clause}, updated_at = NOW() WHERE id = :mid"),
            updates,
        )
        await db.commit()

    return {"success": True, "data": {"message": "Mod updated"}}


@router.delete("/{mod_id}")
async def delete_mod(
    mod_id: int,
    mode: str = Query("archive", regex="^(soft|full|archive)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    mod = await db.execute(
        text("SELECT id, author_id, deleted_at, status FROM mods WHERE id = :mid"),
        {"mid": mod_id},
    )
    mod_row = mod.one_or_none()
    if not mod_row or mod_row.deleted_at:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}})

    is_admin = current_user.role in ("admin", "moderator", "superadmin")

    if mod_row.author_id != current_user.id and not is_admin:
        raise HTTPException(status_code=403, detail={"success": False, "error": {"code": "FORBIDDEN", "message": "Not authorized to delete this mod"}})

    if mode == "full":
        # Full deletion — hard delete from DB (author or admin only)
        # Remove child rows first to satisfy FK constraints
        for table in ("favorites", "reviews", "purchases", "downloads", "moderation_log", "mod_images"):
            try:
                await db.execute(
                    text(f"DELETE FROM {table} WHERE mod_id = :mid"),
                    {"mid": mod_id},
                )
            except Exception:
                pass
        await db.execute(
            text("DELETE FROM mods WHERE id = :mid"),
            {"mid": mod_id},
        )
    elif mode == "archive":
        # Archive — mark as archived, still visible with badge, not downloadable
        await db.execute(
            text("UPDATE mods SET status = 'archived' WHERE id = :mid"),
            {"mid": mod_id},
        )
    else:
        # Soft delete — hide from listings
        await db.execute(
            text("UPDATE mods SET deleted_at = NOW(), is_deleted = 1, status = 'deleted' WHERE id = :mid"),
            {"mid": mod_id},
        )

    await db.commit()
    return {"success": True, "data": {"message": f"Mod {mode} deleted"}}


@router.post("/{mod_id}/restore")
async def restore_mod(mod_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    mod = await db.execute(
        text("SELECT id, author_id, deleted_at, status FROM mods WHERE id = :mid"),
        {"mid": mod_id},
    )
    mod_row = mod.one_or_none()
    if not mod_row:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}})
    if mod_row.status != "archived":
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "NOT_ARCHIVED", "message": "Mod is not archived"}})
    is_admin = current_user.role in ("admin", "moderator", "superadmin")
    if mod_row.author_id != current_user.id and not is_admin:
        raise HTTPException(status_code=403, detail={"success": False, "error": {"code": "FORBIDDEN", "message": "Not authorized to restore this mod"}})

    await db.execute(
        text("UPDATE mods SET status = 'pending', is_deleted = 0, deleted_at = NULL WHERE id = :mid"),
        {"mid": mod_id},
    )
    await db.commit()
    return {"success": True, "data": {"message": "Mod restored and sent for moderation"}}


@router.post("/{mod_id}/request-download")
async def request_download(mod_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    mod = await db.execute(
        text("SELECT id, price, download_url, author_id, deleted_at, status FROM mods WHERE id = :mid"),
        {"mid": mod_id},
    )
    mod_row = mod.one_or_none()
    if not mod_row or mod_row.deleted_at:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}})
    if mod_row.status != "approved":
        raise HTTPException(status_code=403, detail={"success": False, "error": {"code": "MOD_NOT_AVAILABLE", "message": "Mod is not available for download"}})

    if mod_row.author_id == current_user.id:
        return {"success": True, "data": {"download_url": mod_row.download_url}}

    if (mod_row.price or 0) > 0:
        purchase = await db.execute(
            text("SELECT id FROM purchases WHERE user_id = :uid AND mod_id = :mid"),
            {"uid": current_user.id, "mid": mod_id},
        )
        if purchase.scalar():
            return {"success": True, "data": {"download_url": mod_row.download_url}}

    if (mod_row.price or 0) > 0:
        raise HTTPException(status_code=402, detail={"success": False, "error": {"code": "NOT_PURCHASED", "message": "You must purchase this mod before downloading"}})

    if mod_row.price == 0:
        await db.execute(
            text("INSERT INTO downloads (user_id, mod_id, created_at) VALUES (:uid, :mid, NOW()) ON DUPLICATE KEY UPDATE id = id"),
            {"uid": current_user.id, "mid": mod_id},
        )
        await db.execute(
            text("UPDATE mods SET downloads_count = downloads_count + 1 WHERE id = :mid"),
            {"mid": mod_id},
        )
        await db.commit()
        return {"success": True, "data": {"download_url": mod_row.download_url}}

    raise HTTPException(status_code=402, detail={"success": False, "error": {"code": "ACCESS_DENIED", "message": "No access to download this mod"}})


@router.post("/{mod_id}/rate")
async def rate_mod(mod_id: int, req: RateModRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    mod = await db.execute(
        text("SELECT id, author_id, deleted_at FROM mods WHERE id = :mid"),
        {"mid": mod_id},
    )
    mod_row = mod.one_or_none()
    if not mod_row or mod_row.deleted_at:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}})
    if mod_row.author_id == current_user.id:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "CANNOT_RATE_OWN", "message": "You cannot rate your own mod"}})

    has_access = await db.execute(
        text("""
            SELECT 1 FROM downloads WHERE user_id = :uid AND mod_id = :mid
            UNION
            SELECT 1 FROM purchases WHERE user_id = :uid AND mod_id = :mid
        """),
        {"uid": current_user.id, "mid": mod_id},
    )
    if not has_access.scalar():
        raise HTTPException(status_code=403, detail={"success": False, "error": {"code": "NOT_PURCHASED", "message": "You must download or purchase this mod before rating"}})

    existing = await db.execute(
        text("SELECT id, rating FROM mod_ratings WHERE user_id = :uid AND mod_id = :mid"),
        {"uid": current_user.id, "mid": mod_id},
    )
    existing_row = existing.one_or_none()
    if existing_row:
        await db.execute(
            text("UPDATE mod_ratings SET rating = :r WHERE id = :eid"),
            {"r": req.rating, "eid": existing_row.id},
        )
    else:
        await db.execute(
            text("INSERT INTO mod_ratings (user_id, mod_id, rating, created_at) VALUES (:uid, :mid, :r, NOW())"),
            {"uid": current_user.id, "mid": mod_id, "r": req.rating},
        )

    stats = await db.execute(
        text("SELECT COUNT(*) AS cnt, AVG(rating) AS avg FROM mod_ratings WHERE mod_id = :mid"),
        {"mid": mod_id},
    )
    stats_row = stats.one()
    await db.execute(
        text("UPDATE mods SET reviews_count = :cnt, rating = :avg WHERE id = :mid"),
        {"cnt": stats_row.cnt, "avg": round(float(stats_row.avg), 2) if stats_row.avg else 0, "mid": mod_id},
    )
    await db.commit()

    return {"success": True, "data": {"message": "Rating submitted", "average_rating": round(float(stats_row.avg), 2) if stats_row.avg else 0, "rating_count": stats_row.cnt}}


@router.post("/{mod_id}/favorite")
async def toggle_favorite(mod_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    mod = await db.execute(
        text("SELECT id, deleted_at FROM mods WHERE id = :mid"),
        {"mid": mod_id},
    )
    mod_row = mod.one_or_none()
    if not mod_row or mod_row.deleted_at:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}})

    existing = await db.execute(
        text("SELECT id FROM favorites WHERE user_id = :uid AND mod_id = :mid"),
        {"uid": current_user.id, "mid": mod_id},
    )
    if existing.scalar():
        await db.execute(
            text("DELETE FROM favorites WHERE user_id = :uid AND mod_id = :mid"),
            {"uid": current_user.id, "mid": mod_id},
        )
        await db.commit()
        return {"success": True, "data": {"favorited": False}}
    else:
        await db.execute(
            text("INSERT INTO favorites (user_id, mod_id, created_at) VALUES (:uid, :mid, NOW())"),
            {"uid": current_user.id, "mid": mod_id},
        )
        await db.commit()
        return {"success": True, "data": {"favorited": True}}
