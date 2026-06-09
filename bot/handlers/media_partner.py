import logging
from aiogram import Router, F
from aiogram.types import Message
from aiogram.filters import Command

from services.api_client import APIClient

router = Router()
api_client = APIClient()


@router.message(Command("partner_status"))
async def cmd_partner_status(message: Message):
    user_id = message.from_user.id
    result = await api_client.get_media_partner_status(user_id)

    if not result.get("success"):
        await message.answer(
            "❌ Не удалось получить статус заявки: " +
            result.get("error", "Попробуйте позже.")
        )
        return

    data = result.get("data", {})
    status = data.get("status", "none")
    application_date = data.get("application_date", None)
    review_date = data.get("review_date", None)
    rejection_reason = data.get("rejection_reason", None)

    status_texts = {
        "none": "📝 Заявка не подана",
        "pending": "⏳ Заявка на рассмотрении",
        "approved": "✅ Заявка одобрена",
        "rejected": "❌ Заявка отклонена",
        "suspended": "⏸ Статус приостановлен",
    }

    lines = [
        "<b>🎥 Статус медиа-партнёра</b>\n",
        f"Статус: {status_texts.get(status, 'Неизвестно')}",
    ]

    if application_date:
        lines.append(f"Дата подачи: {application_date}")

    if review_date:
        lines.append(f"Дата рассмотрения: {review_date}")

    if rejection_reason:
        lines.append(f"Причина отказа: {rejection_reason}")

    if status == "none":
        lines.append(
            "\n💡 Подать заявку можно в личном кабинете на сайте."
        )
    elif status == "approved":
        lines.append(
            "\n🎉 Поздравляем! Вы имеете доступ к эксклюзивным материалам."
        )

    await message.answer("\n".join(lines))
