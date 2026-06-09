import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.tasks.cleanup import cleanup_expired_codes, cleanup_expired_sessions, unpin_expired_mods

logger = logging.getLogger("scheduler")
scheduler = AsyncIOScheduler()


async def start_scheduler() -> None:
    if scheduler.running:
        return

    scheduler.add_job(
        cleanup_expired_codes,
        "interval",
        hours=1,
        id="cleanup_expired_codes",
        name="Clean up expired verification codes",
        replace_existing=True,
    )

    scheduler.add_job(
        cleanup_expired_sessions,
        "interval",
        hours=1,
        id="cleanup_expired_sessions",
        name="Clean up expired refresh tokens",
        replace_existing=True,
    )

    scheduler.add_job(
        unpin_expired_mods,
        "interval",
        minutes=30,
        id="unpin_expired_mods",
        name="Unpin mods with expired pinned_until",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("APScheduler started with cleanup jobs")


async def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped")
