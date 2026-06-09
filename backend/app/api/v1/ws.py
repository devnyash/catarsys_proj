import asyncio
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError, jwt
from sqlalchemy import text

router = APIRouter()

logger = logging.getLogger("websocket")

SECRET_KEY = "CHANGE_ME_IN_PRODUCTION"
ALGORITHM = "HS256"

connected_clients: dict[int, list[WebSocket]] = {}


async def _send_json(ws: WebSocket, data: dict) -> None:
    try:
        await ws.send_json(data)
    except Exception:
        pass


async def _get_user_id_from_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            return None
        return int(payload["sub"])
    except (JWTError, ValueError, KeyError):
        return None


@router.websocket("/ws/notifications")
async def notifications_endpoint(ws: WebSocket, token: str = Query(...)):
    user_id = await _get_user_id_from_token(token)
    if user_id is None:
        await ws.close(code=4001, reason="Invalid or expired token")
        return

    await ws.accept()

    if user_id not in connected_clients:
        connected_clients[user_id] = []
    connected_clients[user_id].append(ws)

    try:
        from app.core.database import AsyncSessionLocal

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("""
                    SELECT id, type, title, message, is_read, data, created_at
                    FROM notifications
                    WHERE user_id = :uid AND is_read = false
                    ORDER BY created_at DESC
                    LIMIT 50
                """),
                {"uid": user_id},
            )
            rows = result.fetchall()

            if rows:
                unread = [
                    {
                        "id": r.id,
                        "type": r.type,
                        "title": r.title,
                        "message": r.message,
                        "data": r.data,
                        "created_at": r.created_at.isoformat() if r.created_at else None,
                    }
                    for r in rows
                ]
                await _send_json(ws, {"type": "unread_notifications", "data": unread})

        await _send_json(ws, {"type": "connected", "data": {"message": "Connected to notification server"}})

        heartbeat_task = asyncio.create_task(_heartbeat(ws))

        while True:
            try:
                data = await ws.receive_text()
                msg = json.loads(data)

                if msg.get("type") == "ping":
                    await _send_json(ws, {"type": "pong", "data": {"timestamp": datetime.now(timezone.utc).isoformat()}})

                elif msg.get("type") == "mark_read":
                    notification_id = msg.get("notification_id")
                    if notification_id:
                        async with AsyncSessionLocal() as db:
                            await db.execute(
                                text("UPDATE notifications SET is_read = true WHERE id = :nid AND user_id = :uid"),
                                {"nid": notification_id, "uid": user_id},
                            )
                            await db.commit()

                elif msg.get("type") == "mark_all_read":
                    async with AsyncSessionLocal() as db:
                        await db.execute(
                            text("UPDATE notifications SET is_read = true WHERE user_id = :uid AND is_read = false"),
                            {"uid": user_id},
                        )
                        await db.commit()

            except json.JSONDecodeError:
                await _send_json(ws, {"type": "error", "data": {"message": "Invalid JSON"}})
            except WebSocketDisconnect:
                break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
    finally:
        if user_id in connected_clients:
            try:
                connected_clients[user_id].remove(ws)
            except ValueError:
                pass
            if not connected_clients[user_id]:
                del connected_clients[user_id]
        try:
            await ws.close()
        except Exception:
            pass


async def _heartbeat(ws: WebSocket) -> None:
    try:
        while True:
            await asyncio.sleep(30)
            await _send_json(ws, {"type": "ping", "data": {"timestamp": datetime.now(timezone.utc).isoformat()}})
    except asyncio.CancelledError:
        pass
    except Exception:
        pass


async def push_notification(user_id: int, notification: dict) -> None:
    if user_id not in connected_clients:
        return

    message = json.dumps({
        "type": "notification",
        "data": notification,
    })

    for ws in connected_clients[user_id][:]:
        try:
            await ws.send_json({
                "type": "notification",
                "data": notification,
            })
        except Exception:
            try:
                connected_clients[user_id].remove(ws)
            except ValueError:
                pass
