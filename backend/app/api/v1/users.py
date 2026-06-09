from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/{user_id}")
async def get_user_profile(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await db.execute(
        text("""
            SELECT id, username, avatar_url, bio, created_at,
                   (SELECT COUNT(*) FROM mods WHERE author_id = users.id AND deleted_at IS NULL AND status = 'approved') AS mod_count,
                   (SELECT COUNT(*) FROM mod_favorites WHERE user_id = users.id) AS favorite_count
            FROM users
            WHERE id = :uid
        """),
        {"uid": user_id},
    )
    row = user.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}})

    return {
        "success": True,
        "data": {
            "id": row.id,
            "username": row.username,
            "avatar_url": row.avatar_url,
            "bio": row.bio,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "mod_count": row.mod_count,
            "favorite_count": row.favorite_count,
        },
    }


@router.get("/{user_id}/mods")
async def get_user_mods(
    user_id: int,
    cursor: int | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    user = await db.execute(text("SELECT id FROM users WHERE id = :uid"), {"uid": user_id})
    if not user.scalar():
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}})

    conditions = ["m.author_id = :uid", "m.deleted_at IS NULL", "m.status = 'approved'"]
    params = {"uid": user_id}

    if cursor:
        conditions.append("m.id < :cursor")
        params["cursor"] = cursor

    where = " AND ".join(conditions)
    query = text(f"""
        SELECT m.id, m.title, m.category, m.project, m.price, m.cover_url, m.download_count,
               m.average_rating, m.rating_count, m.created_at
        FROM mods m
        WHERE {where}
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT :limit
    """)
    params["limit"] = limit + 1

    result = await db.execute(query, params)
    rows = result.fetchall()

    has_more = len(rows) > limit
    if has_more:
        rows = rows[:limit]

    mods = [
        {
            "id": r.id,
            "title": r.title,
            "category": r.category,
            "project": r.project,
            "price": float(r.price) if r.price else 0,
            "cover_url": r.cover_url,
            "download_count": r.download_count,
            "average_rating": float(r.average_rating) if r.average_rating else 0,
            "rating_count": r.rating_count,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]

    return {
        "success": True,
        "data": {
            "mods": mods,
            "next_cursor": rows[-1].id if has_more and rows else None,
            "has_more": has_more,
        },
    }


@router.get("/{user_id}/reviews")
async def get_user_reviews(
    user_id: int,
    cursor: int | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    user = await db.execute(text("SELECT id FROM users WHERE id = :uid"), {"uid": user_id})
    if not user.scalar():
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}})

    conditions = ["r.user_id = :uid"]
    params = {"uid": user_id}

    if cursor:
        conditions.append("r.id < :cursor")
        params["cursor"] = cursor

    where = " AND ".join(conditions)
    query = text(f"""
        SELECT r.id, r.rating, r.text, r.created_at, m.id AS mod_id, m.title AS mod_title
        FROM mod_ratings r
        JOIN mods m ON m.id = r.mod_id
        WHERE {where}
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT :limit
    """)
    params["limit"] = limit + 1

    result = await db.execute(query, params)
    rows = result.fetchall()

    has_more = len(rows) > limit
    if has_more:
        rows = rows[:limit]

    reviews = [
        {
            "id": r.id,
            "mod_id": r.mod_id,
            "mod_title": r.mod_title,
            "rating": r.rating,
            "text": r.text,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]

    return {
        "success": True,
        "data": {
            "reviews": reviews,
            "next_cursor": rows[-1].id if has_more and rows else None,
            "has_more": has_more,
        },
    }
