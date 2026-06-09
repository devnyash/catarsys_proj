from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter(tags=["updates"])


@router.get("/latest")
async def get_latest_update(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""
            SELECT id, version, file_url, changelog, created_at
            FROM app_versions
            ORDER BY created_at DESC, id DESC
            LIMIT 1
        """),
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "NO_UPDATES", "message": "No updates found"}})

    return {
        "success": True,
        "data": {
            "id": row.id,
            "version": row.version,
            "file_url": row.file_url,
            "changelog": row.changelog,
            "published_at": row.created_at.isoformat() if row.created_at else None,
        },
    }


@router.get("/history")
async def get_update_history(n: int = Query(5, ge=1, le=50), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""
            SELECT id, version, file_url, changelog, created_at
            FROM app_versions
            ORDER BY created_at DESC, id DESC
            LIMIT :limit
        """),
        {"limit": n},
    )
    rows = result.fetchall()

    return {
        "success": True,
        "data": {
            "updates": [
                {
                    "id": r.id,
                    "version": r.version,
                    "file_url": r.file_url,
                    "changelog": r.changelog,
                    "published_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in rows
            ]
        },
    }
