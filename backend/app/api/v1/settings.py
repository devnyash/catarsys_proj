from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(tags=["settings"])

DEFAULT_SETTINGS = {
    "theme": "dark",
    "autoUpdate": True,
    "notifyApp": True,
    "notifyTelegram": False,
    "downloadPath": "~/Downloads/Catarsys/",
}

# Maps frontend camelCase keys to DB snake_case columns
SETTINGS_MAP = {
    "theme": "theme",
    "autoUpdate": "auto_update",
    "notifyApp": "notify_app",
    "notifyTelegram": "notify_telegram",
    "downloadPath": "download_path",
}

# Reverse: DB column → frontend key
REVERSE_MAP = {v: k for k, v in SETTINGS_MAP.items()}

# All DB columns used by this API
DB_COLS = list(SETTINGS_MAP.values())


class UpdateSettingsRequest(BaseModel):
    theme: str | None = None
    autoUpdate: bool | None = None
    notifyApp: bool | None = None
    notifyTelegram: bool | None = None
    downloadPath: str | None = None


@router.get("")
async def get_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text(
            f"SELECT {', '.join(DB_COLS)} FROM user_settings WHERE user_id = :uid"
        ),
        {"uid": current_user.id},
    )
    row = result.one_or_none()

    if not row:
        return {"success": True, "data": dict(DEFAULT_SETTINGS)}

    data = {}
    for db_col in DB_COLS:
        front_key = REVERSE_MAP[db_col]
        val = getattr(row, db_col, None)
        if val is None:
            data[front_key] = DEFAULT_SETTINGS[front_key]
        elif isinstance(val, bool):
            data[front_key] = bool(val)
        elif isinstance(val, int):
            data[front_key] = val
        else:
            data[front_key] = val

    return {"success": True, "data": data}


@router.put("")
async def update_settings(
    req: UpdateSettingsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updates = req.model_dump(exclude_none=True)
    if not updates:
        return await get_settings(current_user, db)

    # Filter only known keys and map to DB column names
    db_updates = {}
    for front_key, value in updates.items():
        db_col = SETTINGS_MAP.get(front_key)
        if not db_col:
            continue
        if isinstance(value, bool):
            db_updates[db_col] = int(value)  # MySQL BOOL = TINYINT(1)
        else:
            db_updates[db_col] = value

    if not db_updates:
        return await get_settings(current_user, db)

    # Check if a settings row already exists
    result = await db.execute(
        text("SELECT id FROM user_settings WHERE user_id = :uid"),
        {"uid": current_user.id},
    )
    exists = result.scalar()

    if exists:
        set_clause = ", ".join(f"{col} = :{col}" for col in db_updates)
        db_updates["uid"] = current_user.id
        await db.execute(
            text(f"UPDATE user_settings SET {set_clause} WHERE user_id = :uid"),
            db_updates,
        )
    else:
        # INSERT with all columns — MySQL strict mode requires explicit values
        cols = ["user_id", "theme", "auto_update", "notify_app", "notify_telegram", "download_path", "ui_scale"]
        params = {
            "user_id": current_user.id,
            "theme": db_updates.get("theme", "dark"),
            "auto_update": db_updates.get("auto_update", 1),
            "notify_app": db_updates.get("notify_app", 1),
            "notify_telegram": db_updates.get("notify_telegram", 0),
            "download_path": db_updates.get("download_path", "~/Downloads/Catarsys/"),
            "ui_scale": 100,
        }
        placeholders = ", ".join(f":{col}" for col in cols)
        await db.execute(
            text(
                f"INSERT INTO user_settings ({', '.join(cols)}) "
                f"VALUES ({placeholders})"
            ),
            params,
        )

    await db.commit()
    return await get_settings(current_user, db)
