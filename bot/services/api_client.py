import httpx
import logging
from typing import Any

BACKEND_BASE_URL = "http://localhost:8001/api/v1"


class APIClient:
    def __init__(self, base_url: str = BACKEND_BASE_URL):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=15.0)

    async def _get(self, path: str, params: dict = None) -> dict:
        try:
            resp = await self.client.get(
                f"{self.base_url}{path}",
                params=params
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            logging.error(f"HTTP error {e.response.status_code} on GET {path}: {e}")
            return {"success": False, "error": f"HTTP {e.response.status_code}"}
        except httpx.RequestError as e:
            logging.error(f"Request error on GET {path}: {e}")
            return {"success": False, "error": "Сервер недоступен"}
        except Exception as e:
            logging.error(f"Unexpected error on GET {path}: {e}")
            return {"success": False, "error": str(e)}

    async def _post(self, path: str, json_data: dict = None) -> dict:
        try:
            resp = await self.client.post(
                f"{self.base_url}{path}",
                json=json_data
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            logging.error(f"HTTP error {e.response.status_code} on POST {path}: {e}")
            return {"success": False, "error": f"HTTP {e.response.status_code}"}
        except httpx.RequestError as e:
            logging.error(f"Request error on POST {path}: {e}")
            return {"success": False, "error": "Сервер недоступен"}
        except Exception as e:
            logging.error(f"Unexpected error on POST {path}: {e}")
            return {"success": False, "error": str(e)}

    async def _put(self, path: str, json_data: dict = None) -> dict:
        try:
            resp = await self.client.put(
                f"{self.base_url}{path}",
                json=json_data
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            logging.error(f"HTTP error {e.response.status_code} on PUT {path}: {e}")
            return {"success": False, "error": f"HTTP {e.response.status_code}"}
        except httpx.RequestError as e:
            logging.error(f"Request error on PUT {path}: {e}")
            return {"success": False, "error": "Сервер недоступен"}
        except Exception as e:
            logging.error(f"Unexpected error on PUT {path}: {e}")
            return {"success": False, "error": str(e)}

    async def close(self):
        await self.client.aclose()

    async def link_telegram(self, telegram_id: int, code: str) -> dict:
        return await self._post("/telegram/link", {
            "telegram_id": telegram_id,
            "code": code,
        })

    async def check_user_authorized(self, telegram_id: int) -> bool:
        result = await self._get(f"/telegram/{telegram_id}/authorized")
        return result.get("success", False) and result.get("data", {}).get("authorized", False)

    async def get_notification_status(self, telegram_id: int) -> dict:
        return await self._get(f"/telegram/{telegram_id}/notifications")

    async def set_notification_preference(self, telegram_id: int, enabled: bool) -> dict:
        return await self._put(f"/telegram/{telegram_id}/notifications", {
            "enabled": enabled,
        })

    async def get_media_partner_status(self, telegram_id: int) -> dict:
        return await self._get(f"/telegram/{telegram_id}/media-partner")

    async def notify_subscription_verified(self, telegram_id: int) -> dict:
        return await self._post(f"/telegram/{telegram_id}/subscription-verified")
