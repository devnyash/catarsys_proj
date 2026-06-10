import asyncio
import logging
import os
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.redis import RedisStorage
from handlers import start, notifications, subscription, media_partner
from middlewares import AuthMiddleware
from aiogram.client.session.aiohttp import AiohttpSession
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
session = AiohttpSession(
    proxy="socks5://psychobots:KCze07BDtAor4oCUvhed@193.17.95.24:20818"
)


BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
if not BOT_TOKEN:
    raise ValueError("TELEGRAM_BOT_TOKEN environment variable is not set")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

async def main():
    bot = Bot(token=BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML), session=session)
    storage = RedisStorage.from_url(REDIS_URL)
    dp = Dispatcher(storage=storage)

    dp.include_router(start.router)
    dp.include_router(notifications.router)
    dp.include_router(subscription.router)
    dp.include_router(media_partner.router)

    dp.message.middleware(AuthMiddleware())

    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
