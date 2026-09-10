"""
Встроенный HTTP-сервер для десктопного приложения Catarsys.

Раздаёт собранный frontend из папки dist/ и проксирует:
  - /api/v1/*   →  https://catarsys.psychoware.ru/api/v1/*
  - /api/v1/ws/* → wss://catarsys.psychoware.ru/api/v1/ws/*  (WebSocket)
"""

import asyncio
import mimetypes
from pathlib import Path
from urllib.parse import urlparse

from aiohttp import web, ClientSession, ClientTimeout, WSMsgType

# Корректные MIME-типы для веб-ассетов
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('image/svg+xml', '.svg')
mimetypes.add_type('application/json', '.json')
mimetypes.add_type('font/woff2', '.woff2')
mimetypes.add_type('font/woff', '.woff')
mimetypes.add_type('font/ttf', '.ttf')


class EmbeddedServer:
    """Локальный HTTP-сервер: статика + прокси API/WS на бэкенд."""

    def __init__(self, dist_dir: Path, backend_url: str):
        self.dist_dir = Path(dist_dir).resolve()
        self.backend_url = backend_url.rstrip('/')
        self.backend_host = urlparse(backend_url).netloc
        self.port: int | None = None
        self.loop: asyncio.AbstractEventLoop | None = None
        self._app = web.Application(middlewares=[self._middleware])
        self._runner: web.AppRunner | None = None
        self._session: ClientSession | None = None

    @property
    def url(self) -> str:
        return f"http://127.0.0.1:{self.port}"

    # --- Public API ---

    async def start(self, loop: asyncio.AbstractEventLoop | None = None) -> int:
        """Запускает сервер на случайном порту. Возвращает номер порта."""
        self.loop = loop or asyncio.get_event_loop()
        self._runner = web.AppRunner(self._app)
        await self._runner.setup()
        site = web.TCPSite(self._runner, '127.0.0.1', 0)
        await site.start()
        self.port = site._server.sockets[0].getsockname()[1]
        self._session = ClientSession()
        return self.port

    async def stop(self):
        """Корректно останавливает сервер."""
        if self._session:
            await self._session.close()
            self._session = None
        if self._runner:
            await self._runner.cleanup()
            self._runner = None
        if self.loop and self.loop.is_running():
            self.loop.call_soon_threadsafe(self.loop.stop)

    # --- Middleware ---

    @web.middleware
    async def _middleware(self, request: web.Request, handler):
        path = request.path

        # WebSocket
        if path.startswith('/api/v1/ws/'):
            return await self._handle_ws(request)

        # API proxy
        if path.startswith('/api/v1/'):
            return await self._proxy_http(request)

        # Static files
        return await self._serve_static(request)

    # --- Static files ---

    async def _serve_static(self, request: web.Request) -> web.StreamResponse:
        if request.method not in ('GET', 'HEAD'):
            return web.Response(status=405)

        rel_path = request.path.lstrip('/') or 'index.html'
        file_path = (self.dist_dir / rel_path).resolve()

        # Защита от path traversal
        try:
            file_path.relative_to(self.dist_dir)
        except ValueError:
            return web.Response(status=403, text="Forbidden")

        if file_path.is_dir():
            file_path = file_path / 'index.html'

        if file_path.exists() and file_path.is_file():
            return web.FileResponse(file_path)

        # SPA-fallback: отдаём index.html для неизвестных маршрутов
        index = self.dist_dir / 'index.html'
        if index.exists():
            return web.FileResponse(index)

        return web.Response(
            status=503,
            text="Frontend not built. Run 'npm run build' in the project root.",
            content_type='text/plain',
        )

    # --- HTTP proxy ---

    async def _proxy_http(self, request: web.Request) -> web.StreamResponse:
        # Формируем target URL
        tail = request.path[len('/api/v1/'):]
        target = f"{self.backend_url}/api/v1/{tail}"
        query = request.query_string
        if query:
            target += f"?{query}"

        # Читаем тело только для методов, у которых оно есть
        body: bytes | None = None
        if request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
            body = await request.read() or None

        # Пропускаем hop-by-hop заголовки
        skip = {'host', 'transfer-encoding', 'connection'}
        if not body:
            skip.add('content-length')
        headers = {k: v for k, v in request.headers.items() if k.lower() not in skip}

        try:
            async with self._session.request(
                method=request.method,
                url=target,
                headers=headers,
                data=body,
                allow_redirects=True,
                timeout=ClientTimeout(total=60),
            ) as resp:
                resp_body = await resp.read()

                response = web.Response(status=resp.status, body=resp_body)
                resp_skip = {'transfer-encoding', 'content-encoding', 'content-length', 'connection'}
                for k, v in resp.headers.items():
                    if k.lower() not in resp_skip:
                        response.headers[k] = v

                return response
        except Exception as e:
            return web.Response(
                status=502,
                text=f"Backend unavailable: {e}",
                content_type='text/plain',
            )

    # --- WebSocket proxy ---

    async def _handle_ws(self, request: web.Request) -> web.WebSocketResponse:
        tail = request.path[len('/api/v1/ws/'):]
        query = request.query_string

        # Бэкенд на HTTPS → используем wss://
        ws_target = f"wss://{self.backend_host}/api/v1/ws/{tail}"
        if query:
            ws_target += f"?{query}"

        ws_client = web.WebSocketResponse()
        await ws_client.prepare(request)

        try:
            backend_ws = await self._session.ws_connect(ws_target)
        except Exception as e:
            await ws_client.close(code=1011, message=f"Backend WS error: {e}".encode())
            return ws_client

        async def proxy(src, dst):
            try:
                async for msg in src:
                    if msg.type == WSMsgType.TEXT:
                        await dst.send_str(msg.data)
                    elif msg.type == WSMsgType.BINARY:
                        await dst.send_bytes(msg.data)
                    elif msg.type in (WSMsgType.CLOSE, WSMsgType.CLOSING, WSMsgType.CLOSED):
                        break
            except Exception:
                pass

        t1 = asyncio.create_task(proxy(ws_client, backend_ws))
        t2 = asyncio.create_task(proxy(backend_ws, ws_client))

        done, pending = await asyncio.wait([t1, t2], return_when=asyncio.FIRST_COMPLETED)
        for t in pending:
            t.cancel()
            try:
                await t
            except (asyncio.CancelledError, Exception):
                pass

        try:
            await ws_client.close()
        except Exception:
            pass
        try:
            await backend_ws.close()
        except Exception:
            pass

        return ws_client
