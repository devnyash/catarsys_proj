from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.settings_repo import SettingsRepository


class SettingsService:
    def __init__(self):
        self.settings_repo = SettingsRepository()

    VALID_KEYS = {"theme", "ui_scale", "auto_update", "notify_app", "notify_telegram", "download_path"}

    async def get_settings(self, db: AsyncSession, user_id: int) -> dict:
        settings = await self.settings_repo.get_by_user(db, user_id)
        if not settings:
            settings = await self.settings_repo.create_default(db, user_id)
            await db.commit()

        return {
            "success": True,
            "data": {
                "theme": settings.theme,
                "ui_scale": settings.ui_scale,
                "auto_update": settings.auto_update,
                "notify_app": settings.notify_app,
                "notify_telegram": settings.notify_telegram,
                "download_path": settings.download_path,
            },
        }

    async def update_settings(self, db: AsyncSession, user_id: int, data: dict) -> dict:
        filtered = {k: v for k, v in data.items() if k in self.VALID_KEYS and v is not None}

        if "theme" in filtered and filtered["theme"] not in ("light", "dark", "system"):
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "INVALID_THEME", "message": "Theme must be one of: light, dark, system"}
            })

        if "ui_scale" in filtered and (filtered["ui_scale"] < 50 or filtered["ui_scale"] > 200):
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "INVALID_UI_SCALE", "message": "UI scale must be between 50 and 200"}
            })

        settings = await self.settings_repo.upsert(db, user_id, **filtered)
        await db.commit()

        return {
            "success": True,
            "data": {
                "theme": settings.theme,
                "ui_scale": settings.ui_scale,
                "auto_update": settings.auto_update,
                "notify_app": settings.notify_app,
                "notify_telegram": settings.notify_telegram,
                "download_path": settings.download_path,
            },
        }
