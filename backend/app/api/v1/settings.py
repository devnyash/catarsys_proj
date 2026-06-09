from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user

router = APIRouter(tags=["settings"])


class UpdateSettingsRequest(BaseModel):
    theme: str | None = None
    language: str | None = None
    email_notifications: bool | None = None
    push_notifications: bool | None = None
    two_factor_enabled: bool | None = None


SETTINGS_KEYS = {"theme", "language", "email_notifications", "push_notifications", "two_factor_enabled"}


@router.get("/")
async def get_settings(user_id: int = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""
            SELECT s.key, s.value
            FROM user_settings s
            WHERE s.user_id = :uid
        """),
        {"uid": user_id},
    )
    rows = result.fetchall()

    defaults = {
        "theme": "dark",
        "language": "en",
        "email_notifications": True,
        "push_notifications": True,
        "two_factor_enabled": False,
    }

    for r in rows:
        val = r.value
        if val in ("true", "false"):
            val = val == "true"
        defaults[r.key] = val

    return {"success": True, "data": defaults}


@router.put("/")
async def update_settings(req: UpdateSettingsRequest, user_id: int = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    updates = req.model_dump(exclude_none=True)

    for key, value in updates.items():
        if key not in SETTINGS_KEYS:
            continue

        if isinstance(value, bool):
            str_value = "true" if value else "false"
        else:
            str_value = str(value)

        await db.execute(
            text("""
                INSERT INTO user_settings (user_id, key, value)
                VALUES (:uid, :key, :val)
                ON CONFLICT (user_id, key)
                DO UPDATE SET value = :val2
            """),
            {"uid": user_id, "key": key, "val": str_value, "val2": str_value},
        )

    await db.commit()

    result = await db.execute(
        text("SELECT key, value FROM user_settings WHERE user_id = :uid"),
        {"uid": user_id},
    )
    rows = result.fetchall()
    current_settings = {}
    for r in rows:
        val = r.value
        if val in ("true", "false"):
            val = val == "true"
        current_settings[r.key] = val

    return {"success": True, "data": current_settings}
