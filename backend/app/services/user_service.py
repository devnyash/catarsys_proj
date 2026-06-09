from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.user_repo import UserRepository
from app.repositories.mod_repo import ModRepository


class UserService:
    def __init__(self):
        self.user_repo = UserRepository()
        self.mod_repo = ModRepository()

    async def get_profile(self, db: AsyncSession, user_id: int) -> dict:
        user = await self.user_repo.get_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail={
                "success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}
            })

        stats = await db.execute(
            text("""
                SELECT
                    (SELECT COUNT(*) FROM mods WHERE author_id = :uid AND is_deleted = false AND status = 'approved') AS mod_count,
                    (SELECT COUNT(*) FROM favorites WHERE user_id = :uid2) AS favorite_count
            """),
            {"uid": user_id, "uid2": user_id},
        )
        row = stats.one()

        return {
            "success": True,
            "data": {
                "id": user.id,
                "username": user.username,
                "avatar_media_id": user.avatar_media_id,
                "rating": float(user.rating) if user.rating else 0,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "mod_count": row.mod_count,
                "favorite_count": row.favorite_count,
            },
        }

    async def get_user_mods(
        self,
        db: AsyncSession,
        user_id: int,
        cursor: int | None = None,
        limit: int = 20,
    ) -> dict:
        user = await self.user_repo.get_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail={
                "success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}
            })

        mods, has_more = await self.mod_repo.get_user_mods(db, user_id, cursor=cursor, limit=limit)

        return {
            "success": True,
            "data": {
                "mods": [
                    {
                        "id": m.id,
                        "title": m.title,
                        "category": m.category,
                        "project": m.project,
                        "price": float(m.price) if m.price else 0,
                        "cover_media_id": m.cover_media_id,
                        "downloads_count": m.downloads_count,
                        "rating": float(m.rating) if m.rating else 0,
                        "reviews_count": m.reviews_count,
                        "created_at": m.created_at.isoformat() if m.created_at else None,
                    }
                    for m in mods
                ],
                "next_cursor": mods[-1].id if has_more and mods else None,
                "has_more": has_more,
            },
        }

    async def get_user_reviews(
        self,
        db: AsyncSession,
        user_id: int,
        cursor: int | None = None,
        limit: int = 20,
    ) -> dict:
        user = await self.user_repo.get_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail={
                "success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}
            })

        conditions = "r.user_id = :uid"
        params = {"uid": user_id}
        if cursor:
            conditions += " AND r.id < :cursor"
            params["cursor"] = cursor

        params["limit"] = limit + 1
        result = await db.execute(
            text(f"""
                SELECT r.id, r.score, r.comment, r.created_at, m.id AS mod_id, m.title AS mod_title
                FROM reviews r
                JOIN mods m ON m.id = r.mod_id
                WHERE {conditions}
                ORDER BY r.created_at DESC, r.id DESC
                LIMIT :limit
            """),
            params,
        )
        rows = result.fetchall()

        has_more = len(rows) > limit
        if has_more:
            rows = rows[:limit]

        reviews = [
            {
                "id": r.id,
                "mod_id": r.mod_id,
                "mod_title": r.mod_title,
                "score": r.score,
                "comment": r.comment,
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
