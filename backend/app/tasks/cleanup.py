import logging

from sqlalchemy import text

from app.core.database import async_session

logger = logging.getLogger("tasks.cleanup")


async def cleanup_expired_codes() -> int:
    try:
        async with async_session() as db:
            result = await db.execute(
                text("DELETE FROM email_verifications WHERE expires_at < NOW()")
            )
            await db.commit()
            deleted = result.rowcount
            if deleted > 0:
                logger.info(f"Cleaned up {deleted} expired verification codes")
            return deleted
    except Exception as e:
        logger.error(f"Failed to clean up expired codes: {e}")
        return 0


async def cleanup_expired_sessions() -> int:
    try:
        async with async_session() as db:
            result = await db.execute(
                text("DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked = true")
            )
            await db.commit()
            deleted = result.rowcount
            if deleted > 0:
                logger.info(f"Cleaned up {deleted} expired/revoked sessions")
            return deleted
    except Exception as e:
        logger.error(f"Failed to clean up expired sessions: {e}")
        return 0


async def unpin_expired_mods() -> int:
    try:
        async with async_session() as db:
            result = await db.execute(
                text("""
                    UPDATE mods
                    SET is_pinned = false, pinned_until = NULL
                    WHERE pinned_until IS NOT NULL AND pinned_until < NOW()
                """)
            )
            await db.commit()
            updated = result.rowcount
            if updated > 0:
                logger.info(f"Unpinned {updated} expired mods")
            return updated
    except Exception as e:
        logger.error(f"Failed to unpin expired mods: {e}")
        return 0
