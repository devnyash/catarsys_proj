import logging
from typing import Callable, Dict, Any, Awaitable
from aiogram import BaseMiddleware
from aiogram.types import Message, TelegramObject
from aiogram.filters import Command

from services.api_client import APIClient

api_client = APIClient()

PUBLIC_COMMANDS = ["start", "help", "link"]


class AuthMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        if isinstance(event, Message):
            user_id = event.from_user.id

            command = None
            if event.text and event.text.startswith("/"):
                command = event.text.split()[0][1:].lower()

            if command in PUBLIC_COMMANDS:
                return await handler(event, data)

            is_authorized = await api_client.check_user_authorized(user_id)
            if not is_authorized:
                await event.answer(
                    "🔒 Для использования бота необходимо привязать аккаунт.\n\n"
                    "Используйте команду /link <code> для привязки.\n"
                    "Код можно получить в личном кабинете на сайте."
                )
                return

        return await handler(event, data)
