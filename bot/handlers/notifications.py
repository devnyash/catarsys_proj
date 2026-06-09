import logging
from aiogram import Router, F
from aiogram.types import Message
from aiogram.filters import Command

from services.api_client import APIClient

router = Router()
api_client = APIClient()


@router.message(Command("notif_on"))
async def cmd_notif_on(message: Message):
    user_id = message.from_user.id
    result = await api_client.set_notification_preference(user_id, True)
    if result.get("success"):
        await message.answer(
            "🔔 Уведомления включены.\n"
            "Вы будете получать оповещения об обновлениях модов."
        )
    else:
        await message.answer(
            "❌ Не удалось включить уведомления: " +
            result.get("error", "Попробуйте позже.")
        )


@router.message(Command("notif_off"))
async def cmd_notif_off(message: Message):
    user_id = message.from_user.id
    result = await api_client.set_notification_preference(user_id, False)
    if result.get("success"):
        await message.answer(
            "🔕 Уведомления выключены.\n"
            "Вы больше не будете получать оповещения."
        )
    else:
        await message.answer(
            "❌ Не удалось выключить уведомления: " +
            result.get("error", "Попробуйте позже.")
        )


@router.message(Command("status"))
async def cmd_status(message: Message):
    user_id = message.from_user.id
    result = await api_client.get_notification_status(user_id)
    if result.get("success"):
        status = result.get("data", {})
        subscribed = status.get("subscribed", False)
        platform_linked = status.get("platform_linked", False)
        notif_enabled = status.get("notifications_enabled", False)

        lines = ["<b>📊 Ваш статус:</b>\n"]
        lines.append(
            f"🔗 Аккаунт привязан к платформе: "
            f"{'✅ Да' if platform_linked else '❌ Нет'}"
        )
        lines.append(
            f"🔔 Уведомления: "
            f"{'✅ Включены' if notif_enabled else '❌ Выключены'}"
        )
        lines.append(
            f"📡 Подписка активна: "
            f"{'✅ Да' if subscribed else '❌ Нет'}"
        )
        await message.answer("\n".join(lines))
    else:
        await message.answer(
            "❌ Не удалось получить статус: " +
            result.get("error", "Попробуйте позже.")
        )
