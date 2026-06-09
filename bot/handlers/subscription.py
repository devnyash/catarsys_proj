import logging
from aiogram import Router, F
from aiogram.types import Message, ChatMemberUpdated
from aiogram.filters import Command, ChatMemberUpdatedFilter, IS_NOT_MEMBER, IS_MEMBER

from services.api_client import APIClient

router = Router()
api_client = APIClient()

REQUIRED_CHANNELS = ["@catarsys_updates", "@catarsys_news"]


@router.message(Command("check_sub"))
async def cmd_check_sub(message: Message):
    user_id = message.from_user.id
    results = []
    all_subscribed = True

    for channel in REQUIRED_CHANNELS:
        try:
            chat_member = await message.bot.get_chat_member(
                chat_id=channel,
                user_id=user_id
            )
            is_member = chat_member.status in ("member", "administrator", "creator")
            if not is_member:
                all_subscribed = False
            results.append((channel, is_member))
        except Exception as e:
            results.append((channel, False))
            all_subscribed = False
            logging.error(f"Failed to check {channel}: {e}")

    lines = ["<b>📋 Статус подписок:</b>\n"]
    for channel, subscribed in results:
        icon = "✅" if subscribed else "❌"
        lines.append(f"{icon} {channel}")

    lines.append("")
    if all_subscribed:
        lines.append("✨ Вы подписаны на все необходимые каналы!")
    else:
        lines.append(
            "⚠️ Подпишитесь на все каналы, чтобы получить доступ к функциям."
        )

    await message.answer("\n".join(lines))


async def verify_subscription(user_id: int, bot) -> bool:
    for channel in REQUIRED_CHANNELS:
        try:
            chat_member = await bot.get_chat_member(
                chat_id=channel,
                user_id=user_id
            )
            if chat_member.status not in ("member", "administrator", "creator"):
                return False
        except Exception as e:
            logging.error(f"Subscription check error for {channel}: {e}")
            return False
    return True


@router.chat_member(ChatMemberUpdatedFilter(member_status_changed=IS_NOT_MEMBER >> IS_MEMBER))
async def on_user_joined(event: ChatMemberUpdated):
    user_id = event.new_chat_member.user.id
    chat_id = event.chat.id

    if event.chat.username and f"@{event.chat.username}" in REQUIRED_CHANNELS:
        await api_client.notify_subscription_verified(user_id)
        try:
            await event.bot.send_message(
                user_id,
                f"✅ Спасибо за подписку на {event.chat.title or event.chat.username}!\n"
                "Ваша подписка подтверждена."
            )
        except Exception as e:
            logging.error(f"Failed to notify user {user_id}: {e}")
