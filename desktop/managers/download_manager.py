import asyncio
import aiofiles
import httpx
import os
import re
from pathlib import Path
from typing import Callable, Optional

class DownloadProvider:
    async def resolve_download_url(self, user_url: str) -> str:
        raise NotImplementedError

class YandexDiskProvider(DownloadProvider):
    async def resolve_download_url(self, user_url: str) -> str:
        match = re.search(r'/d/([a-zA-Z0-9_-]+)', user_url)
        if not match:
            raise ValueError("Invalid Yandex Disk URL")
        public_key = match.group(1)
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                'https://cloud-api.yandex.net/v1/disk/public/resources/download',
                params={'public_key': f'https://disk.yandex.ru/d/{public_key}'}
            )
            resp.raise_for_status()
            return resp.json()['href']

class GoogleDriveProvider(DownloadProvider):
    async def resolve_download_url(self, user_url: str) -> str:
        match = re.search(r'/d/([a-zA-Z0-9_-]+)', user_url)
        if not match:
            match = re.search(r'id=([a-zA-Z0-9_-]+)', user_url)
        if not match:
            raise ValueError("Invalid Google Drive URL")
        file_id = match.group(1)
        return f'https://drive.usercontent.google.com/download?id={file_id}&export=download&confirm=t'

class DropMeFilesProvider(DownloadProvider):
    async def resolve_download_url(self, user_url: str) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.get(user_url)
            resp.raise_for_status()
            match = re.search(r'href="([^"]+)"[^>]*>Download<', resp.text)
            if match:
                return match.group(1)
            raise ValueError("Could not find download link")

class DirectUrlProvider(DownloadProvider):
    async def resolve_download_url(self, user_url: str) -> str:
        return user_url

class DownloadManager:
    def __init__(self, api):
        self.api = api
        self.active_downloads: dict[int, asyncio.Task] = {}
        self.paused_downloads: set[int] = set()
        self.providers = {
            'yandex': YandexDiskProvider(),
            'google': GoogleDriveProvider(),
            'dropmefiles': DropMeFilesProvider(),
            'direct': DirectUrlProvider(),
        }
        self.max_concurrent = 5
        self._download_path = Path.home() / 'Downloads' / 'Catarsys'
        self._download_path.mkdir(parents=True, exist_ok=True)
        self._semaphore = asyncio.Semaphore(self.max_concurrent)

    def _detect_provider(self, url: str) -> DownloadProvider:
        if 'disk.yandex' in url:
            return self.providers['yandex']
        elif 'drive.google' in url:
            return self.providers['google']
        elif 'dropmefiles' in url:
            return self.providers['dropmefiles']
        else:
            return self.providers['direct']

    def _update_progress(self, mod_id: int, downloaded: int, total: int, speed: float):
        percent = int(downloaded / total * 100) if total > 0 else 0
        js = f"window.__updateDownloadProgress({mod_id}, {percent}, {downloaded}, {total}, {speed})"
        if self.api._window:
            self.api._window.evaluate_js(js)

    async def start_download(self, mod_id: int, url: str, filename: Optional[str] = None):
        if len(self.active_downloads) >= self.max_concurrent:
            raise RuntimeError("Max concurrent downloads reached")

        task = asyncio.create_task(self._download_task(mod_id, url, filename))
        self.active_downloads[mod_id] = task
        try:
            await task
        except asyncio.CancelledError:
            pass
        finally:
            self.active_downloads.pop(mod_id, None)

    async def _download_task(self, mod_id: int, url: str, filename: Optional[str]):
        async with self._semaphore:
            try:
                provider = self._detect_provider(url)
                direct_url = await provider.resolve_download_url(url)

                async with httpx.AsyncClient(timeout=30.0) as client:
                    async with client.stream('GET', direct_url, follow_redirects=True) as response:
                        response.raise_for_status()
                        total = int(response.headers.get('content-length', 0))

                        if not filename:
                            content_disposition = response.headers.get('content-disposition', '')
                            filename_match = re.search(r'filename="?([^"]+)"?', content_disposition)
                            filename = filename_match.group(1) if filename_match else f'mod_{mod_id}.zip'

                        filepath = self._download_path / filename
                        downloaded = 0
                        start_time = asyncio.get_event_loop().time()
                        chunk_sizes = []
                        chunk_times = []

                        async with aiofiles.open(filepath, 'wb') as f:
                            async for chunk in response.aiter_bytes(8192):
                                while mod_id in self.paused_downloads:
                                    await asyncio.sleep(0.5)

                                await f.write(chunk)
                                downloaded += len(chunk)

                                now = asyncio.get_event_loop().time()
                                chunk_sizes.append(len(chunk))
                                chunk_times.append(now)
                                if len(chunk_sizes) > 5:
                                    chunk_sizes.pop(0)
                                    chunk_times.pop(0)

                                elapsed = now - chunk_times[0] if chunk_times else 1
                                speed = sum(chunk_sizes) / elapsed if elapsed > 0 else 0

                                if total > 0:
                                    self._update_progress(mod_id, downloaded, total, speed)

                        if total > 0 and downloaded >= total:
                            self._update_progress(mod_id, total, total, 0)
                            js = f"window.__onDownloadComplete({mod_id})"
                            if self.api._window:
                                self.api._window.evaluate_js(js)

            except Exception as e:
                js = f"window.__onDownloadError({mod_id}, '{str(e)}')"
                if self.api._window:
                    self.api._window.evaluate_js(js)

    async def cancel_download(self, mod_id: int):
        if mod_id in self.active_downloads:
            self.active_downloads[mod_id].cancel()
            self.active_downloads.pop(mod_id, None)
        self.paused_downloads.discard(mod_id)

    async def pause_download(self, mod_id: int):
        self.paused_downloads.add(mod_id)

    async def resume_download(self, mod_id: int):
        self.paused_downloads.discard(mod_id)
