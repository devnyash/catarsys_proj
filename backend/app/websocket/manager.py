import json
import logging

from fastapi import WebSocket

logger = logging.getLogger("websocket.manager")


class ConnectionManager:
    def __init__(self):
        self._connections: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int) -> None:
        await websocket.accept()
        if user_id not in self._connections:
            self._connections[user_id] = []
        self._connections[user_id].append(websocket)
        logger.info(f"User {user_id} connected (total connections: {len(self._connections[user_id])})")

    def disconnect(self, websocket: WebSocket) -> None:
        for user_id, connections in list(self._connections.items()):
            try:
                connections.remove(websocket)
            except ValueError:
                continue
            if not connections:
                del self._connections[user_id]
            logger.info(f"User {user_id} disconnected")
            break

    async def send_personal(self, user_id: int, message: dict) -> None:
        connections = self._connections.get(user_id, [])
        for ws in connections[:]:
            try:
                await ws.send_json(message)
            except Exception:
                try:
                    connections.remove(ws)
                except ValueError:
                    pass

    async def broadcast(self, message: dict) -> None:
        for user_id, connections in list(self._connections.items()):
            for ws in connections[:]:
                try:
                    await ws.send_json(message)
                except Exception:
                    try:
                        connections.remove(ws)
                    except ValueError:
                        pass

    def get_user_connections(self, user_id: int) -> list[WebSocket]:
        return self._connections.get(user_id, [])

    def get_connected_users(self) -> list[int]:
        return list(self._connections.keys())

    @property
    def active_connections(self) -> dict[int, list[WebSocket]]:
        return self._connections
