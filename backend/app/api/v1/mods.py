import json
import math
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from pydantic import BaseModel, field_validator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/mods", tags=["mods"])


class CreateModRequest(BaseModel):
    title: str
    description: str
    category: str
    project: str
    price: float = 0.0
    subscription_price: float | None = None
    file_url: str | None = None


class UpdateModRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    project: str | None = None
    price: float | None = None
    subscription_price: float | None = None
    file_url: str | None = None


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
    return {
        "id": row.id,
        "title": row.title,
        "description": row.description,
        "category": row.category,
        "project": row.project,
        "author_id": row.author_id,
        "author_username": getattr(row, "author_username", None),
        "price": float(row.price) if row.price else 0,
        "subscription_price": float(row.subscription_price) if row.subscription_price else None,
        "cover_url": row.cover_url,
        "status": row.status,
        "is_pinned": row.is_pinned,
        "download_count": row.download_count,
        "average_rating": float(row.average_rating) if row.average_rating else 0,
        "rating_count": row.rating_count,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


@router.get("/")
async def list_mods(
    cursor: str | None = Query(None),
    category: str | None = Query(None),
    project: str | None = Query(None),
    sort: str = Query("created_at"),
    limit: int = Query(CURSOR_PAGE_SIZE, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    conditions = ["m.deleted_at IS NULL", "m.status = 'approved'"]
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
                sort_col = sort if sort in ("created_at", "download_count", "average_rating", "price", "updated_at") else "created_at"
                op = "<" if sort in ("created_at", "updated_at") else "<"
                conditions.append(f"(m.{sort_col}, m.id) < (:cursor_val, :cursor_id)")
                params["cursor_val"] = cursor_val
                params["cursor_id"] = cursor_id
        except (json.JSONDecodeError, KeyError, TypeError):
            pass

    order_col = sort if sort in ("created_at", "download_count", "average_rating", "price", "updated_at") else "created_at"
    order_dir = "DESC" if sort in ("created_at", "download_count", "average_rating", "updated_at") else "DESC"

    where_clause = " AND ".join(conditions)
    query = text(
        f"""
        SELECT m.*, u.username AS author_username
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

    next_cursor = None
    if has_more and rows:
        last = rows[-1]
        sort_val = getattr(last, sort if sort in ("created_at", "download_count", "average_rating", "price", "updated_at") else "created_at")
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

    conditions = ["m.deleted_at IS NULL", "m.status = 'approved'", "MATCH(m.title, m.description) AGAINST(:search_term IN BOOLEAN MODE)"]
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


@router.get("/{mod_id}")
async def get_mod(mod_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""
            SELECT m.*, u.username AS author_username
            FROM mods m
            JOIN users u ON u.id = m.author_id
            WHERE m.id = :mid AND m.deleted_at IS NULL
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

    return {
        "success": True,
        "data": {
            **_serialize_mod(row),
            "images": [{"id": r.id, "url": r.url, "sort_order": r.sort_order} for r in image_rows],
        },
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_mod(req: CreateModRequest, user_id: int = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if req.price < 0:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "INVALID_PRICE", "message": "Price cannot be negative"}})
    if req.subscription_price is not None and req.subscription_price < 0:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "INVALID_PRICE", "message": "Subscription price cannot be negative"}})

    result = await db.execute(
        text("""
            INSERT INTO mods (title, description, category, project, price, subscription_price, file_url, author_id, status, download_count, average_rating, rating_count, is_pinned, created_at, updated_at)
            VALUES (:title, :desc, :cat, :proj, :price, :sub_price, :file_url, :author, 'pending', 0, 0.0, 0, false, NOW(), NOW())
            RETURNING id
        """),
        {
            "title": req.title,
            "desc": req.description,
            "cat": req.category,
            "proj": req.project,
            "price": req.price,
            "sub_price": req.subscription_price or 0,
            "file_url": req.file_url or "",
            "author": user_id,
        },
    )
    mod_id = result.scalar()
    await db.commit()

    return {"success": True, "data": {"id": mod_id, "message": "Mod created and pending moderation"}}


@router.put("/{mod_id}")
async def update_mod(mod_id: int, req: UpdateModRequest, user_id: int = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    mod = await db.execute(
        text("SELECT id, author_id, deleted_at, status FROM mods WHERE id = :mid"),
        {"mid": mod_id},
    )
    mod_row = mod.one_or_none()
    if not mod_row or mod_row.deleted_at:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}})
    if mod_row.author_id != user_id:
        raise HTTPException(status_code=403, detail={"success": False, "error": {"code": "FORBIDDEN", "message": "Only the author can update this mod"}})

    updates = {}
    for field in ("title", "description", "category", "project", "file_url"):
        val = getattr(req, field, None)
        if val is not None:
            updates[field] = val
    if req.price is not None:
        if req.price < 0:
            raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "INVALID_PRICE", "message": "Price cannot be negative"}})
        updates["price"] = req.price
    if req.subscription_price is not None:
        if req.subscription_price < 0:
            raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "INVALID_PRICE", "message": "Subscription price cannot be negative"}})
        updates["subscription_price"] = req.subscription_price

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
async def delete_mod(mod_id: int, user_id: int = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    mod = await db.execute(
        text("SELECT id, author_id, deleted_at FROM mods WHERE id = :mid"),
        {"mid": mod_id},
    )
    mod_row = mod.one_or_none()
    if not mod_row or mod_row.deleted_at:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}})

    user = await db.execute(
        text("SELECT role FROM users WHERE id = :uid"),
        {"uid": user_id},
    )
    user_row = user.one_or_none()
    is_admin = user_row and user_row.role in ("admin", "moderator")

    if mod_row.author_id != user_id and not is_admin:
        raise HTTPException(status_code=403, detail={"success": False, "error": {"code": "FORBIDDEN", "message": "Not authorized to delete this mod"}})

    await db.execute(
        text("UPDATE mods SET deleted_at = NOW(), status = 'deleted' WHERE id = :mid"),
        {"mid": mod_id},
    )
    await db.commit()

    return {"success": True, "data": {"message": "Mod deleted"}}


@router.post("/{mod_id}/request-download")
async def request_download(mod_id: int, user_id: int = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    mod = await db.execute(
        text("SELECT id, price, subscription_price, file_url, author_id, deleted_at, status FROM mods WHERE id = :mid"),
        {"mid": mod_id},
    )
    mod_row = mod.one_or_none()
    if not mod_row or mod_row.deleted_at:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}})
    if mod_row.status != "approved":
        raise HTTPException(status_code=403, detail={"success": False, "error": {"code": "MOD_NOT_AVAILABLE", "message": "Mod is not available for download"}})

    if mod_row.author_id == user_id:
        return {"success": True, "data": {"download_url": mod_row.file_url}}

    if (mod_row.price or 0) > 0 or (mod_row.subscription_price or 0) > 0:
        purchase = await db.execute(
            text("SELECT id FROM purchases WHERE user_id = :uid AND mod_id = :mid"),
            {"uid": user_id, "mid": mod_id},
        )
        if purchase.scalar():
            return {"success": True, "data": {"download_url": mod_row.file_url}}

        subscription = await db.execute(
            text("SELECT id FROM subscriptions WHERE user_id = :uid AND mod_id = :mid AND expires_at > NOW()"),
            {"uid": user_id, "mid": mod_id},
        )
        if subscription.scalar():
            return {"success": True, "data": {"download_url": mod_row.file_url}}

        if (mod_row.subscription_price or 0) > 0:
            raise HTTPException(status_code=402, detail={"success": False, "error": {"code": "SUBSCRIPTION_REQUIRED", "message": "Active subscription required to download this mod"}})
        if (mod_row.price or 0) > 0:
            raise HTTPException(status_code=402, detail={"success": False, "error": {"code": "NOT_PURCHASED", "message": "You must purchase this mod before downloading"}})

    if mod_row.price == 0 and (mod_row.subscription_price is None or mod_row.subscription_price == 0):
        await db.execute(
            text("INSERT INTO downloads (user_id, mod_id, created_at) VALUES (:uid, :mid, NOW()) ON CONFLICT DO NOTHING"),
            {"uid": user_id, "mid": mod_id},
        )
        await db.execute(
            text("UPDATE mods SET download_count = download_count + 1 WHERE id = :mid"),
            {"mid": mod_id},
        )
        await db.commit()
        return {"success": True, "data": {"download_url": mod_row.file_url}}

    raise HTTPException(status_code=402, detail={"success": False, "error": {"code": "ACCESS_DENIED", "message": "No access to download this mod"}})


@router.post("/{mod_id}/rate")
async def rate_mod(mod_id: int, req: RateModRequest, user_id: int = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    mod = await db.execute(
        text("SELECT id, author_id, deleted_at FROM mods WHERE id = :mid"),
        {"mid": mod_id},
    )
    mod_row = mod.one_or_none()
    if not mod_row or mod_row.deleted_at:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}})
    if mod_row.author_id == user_id:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "CANNOT_RATE_OWN", "message": "You cannot rate your own mod"}})

    has_access = await db.execute(
        text("""
            SELECT 1 FROM downloads WHERE user_id = :uid AND mod_id = :mid
            UNION
            SELECT 1 FROM purchases WHERE user_id = :uid AND mod_id = :mid
        """),
        {"uid": user_id, "mid": mod_id},
    )
    if not has_access.scalar():
        raise HTTPException(status_code=403, detail={"success": False, "error": {"code": "NOT_PURCHASED", "message": "You must download or purchase this mod before rating"}})

    existing = await db.execute(
        text("SELECT id, rating FROM mod_ratings WHERE user_id = :uid AND mod_id = :mid"),
        {"uid": user_id, "mid": mod_id},
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
            {"uid": user_id, "mid": mod_id, "r": req.rating},
        )

    stats = await db.execute(
        text("SELECT COUNT(*) AS cnt, AVG(rating) AS avg FROM mod_ratings WHERE mod_id = :mid"),
        {"mid": mod_id},
    )
    stats_row = stats.one()
    await db.execute(
        text("UPDATE mods SET rating_count = :cnt, average_rating = :avg WHERE id = :mid"),
        {"cnt": stats_row.cnt, "avg": round(float(stats_row.avg), 2) if stats_row.avg else 0, "mid": mod_id},
    )
    await db.commit()

    return {"success": True, "data": {"message": "Rating submitted", "average_rating": round(float(stats_row.avg), 2) if stats_row.avg else 0, "rating_count": stats_row.cnt}}


@router.post("/{mod_id}/favorite")
async def toggle_favorite(mod_id: int, user_id: int = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    mod = await db.execute(
        text("SELECT id, deleted_at FROM mods WHERE id = :mid"),
        {"mid": mod_id},
    )
    mod_row = mod.one_or_none()
    if not mod_row or mod_row.deleted_at:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}})

    existing = await db.execute(
        text("SELECT id FROM mod_favorites WHERE user_id = :uid AND mod_id = :mid"),
        {"uid": user_id, "mid": mod_id},
    )
    if existing.scalar():
        await db.execute(
            text("DELETE FROM mod_favorites WHERE user_id = :uid AND mod_id = :mid"),
            {"uid": user_id, "mid": mod_id},
        )
        await db.commit()
        return {"success": True, "data": {"favorited": False}}
    else:
        await db.execute(
            text("INSERT INTO mod_favorites (user_id, mod_id, created_at) VALUES (:uid, :mid, NOW())"),
            {"uid": user_id, "mid": mod_id},
        )
        await db.commit()
        return {"success": True, "data": {"favorited": True}}
