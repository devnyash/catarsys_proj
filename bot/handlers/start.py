import logging
from aiogram import Router, F
from aiogram.types import Message
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

from services.api_client import APIClient

router = Router()
api_client = APIClient()


class LinkState(StatesGroup):
    waiting_for_code = State()


@router.message(CommandStart())
async def cmd_start(message: Message):
    await message.answer(
        "<b>Добро пожаловать в Catarsys Bot!</b>\n\n"
        "Этот бот помогает отслеживать обновления модов, "
        "управлять подписками и получать уведомления.\n\n"
        "Доступные команды:\n"
        "/link - привязать аккаунт Telegram к платформе\n"
        "/help - список всех команд\n"
        "/notif_on - включить уведомления\n"
        "/notif_off - выключить уведомления\n"
        "/status - статус уведомлений\n"
        "/partner_status - статус заявки медиа-партнёра"
    )


@router.message(Command("help"))
async def cmd_help(message: Message):
    await message.answer(
        "<b>Список команд:</b>\n\n"
        "/start - начать работу с ботом\n"
        "/link <code> - привязать аккаунт Telegram к платформе\n"
        "/help - показать это сообщение\n"
        "/notif_on - включить уведомления\n"
        "/notif_off - выключить уведомления\n"
        "/status - проверить статус уведомлений\n"
        "/partner_status - проверить статус заявки медиа-партнёра\n\n"
        "<i>Для привязки аккаунта используйте код из личного кабинета на сайте.</i>"
    )


@router.message(Command("link"))
async def cmd_link(message: Message, state: FSMContext):
    args = message.text.split(maxsplit=1)
    if len(args) < 2:
        await state.set_state(LinkState.waiting_for_code)
        await message.answer(
            "Введите код привязки из личного кабинета на сайте:"
        )
        return

    code = args[1].strip()
    await process_link_code(message, code)


@router.message(LinkState.waiting_for_code)
async def process_link_code_input(message: Message, state: FSMContext):
    code = message.text.strip()
    await state.clear()
    await process_link_code(message, code)


async def process_link_code(message: Message, code: str):
    result = await api_client.link_telegram(message.from_user.id, code)
    if result.get("success"):
        await message.answer(
            "✅ Аккаунт успешно привязан!\n\n"
            "Теперь вы будете получать уведомления от платформы."
        )
    else:
        await message.answer(
            "❌ Ошибка привязки: " + result.get("error", "Неверный код или код истёк.")
        )
