import asyncio
import aiofiles
import httpx
import hashlib
import subprocess
import platform
from pathlib import Path
from typing import Optional

class UpdateManager:
    def __init__(self, api):
        self.api = api
        self._window = None
        self._update_dir = Path.home() / '.catarsys' / 'updates'
        self._update_dir.mkdir(parents=True, exist_ok=True)

    def get_current_version(self) -> str:
        version_file = Path(__file__).parent.parent / 'VERSION'
        if version_file.exists():
            return version_file.read_text().strip()
        return "1.3.0"

    async def check_for_updates(self) -> dict:
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(
                    'http://localhost:8001/api/v1/app/updates/latest',
                    timeout=10
                )
                if resp.status_code == 200:
                    return resp.json()
            except Exception:
                pass
            return {
                "current_version": self.get_current_version(),
                "latest_version": self.get_current_version(),
                "has_update": False,
                "is_critical": False,
                "download_url": None,
                "file_size_bytes": 0,
                "changelog": []
            }

    def _update_progress(self, percent: int, downloaded: int, total: int, speed: float):
        js = f"window.__updateProgress({percent}, {downloaded}, {total}, {speed})"
        if self.api._window:
            self.api._window.evaluate_js(js)

    async def download_update(self, url: str, expected_sha256: Optional[str] = None) -> Path:
        filepath = self._update_dir / 'catarsys_update.exe'

        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream('GET', url, follow_redirects=True) as response:
                response.raise_for_status()
                total = int(response.headers.get('content-length', 0))
                downloaded = 0

                async with aiofiles.open(filepath, 'wb') as f:
                    async for chunk in response.aiter_bytes(8192):
                        await f.write(chunk)
                        downloaded += len(chunk)
                        if total > 0:
                            percent = int(downloaded / total * 100)
                            self._update_progress(percent, downloaded, total, 0)

        if expected_sha256:
            if not self.verify_checksum(filepath, expected_sha256):
                raise ValueError("Checksum verification failed")

        return filepath

    def verify_checksum(self, file_path: Path, expected_sha256: str) -> bool:
        sha256 = hashlib.sha256()
        with open(file_path, 'rb') as f:
            while chunk := f.read(65536):
                sha256.update(chunk)
        return sha256.hexdigest() == expected_sha256.lower()

    def install_update(self, installer_path: Path) -> None:
        system = platform.system().lower()
        if system == 'win32':
            subprocess.Popen([str(installer_path), '/silent', '/norestart'])
        elif system == 'darwin':
            subprocess.Popen(['open', str(installer_path)])
        else:
            subprocess.Popen(['sh', str(installer_path)])
