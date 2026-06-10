import webview
import os
import json
import httpx
import asyncio
from pathlib import Path
from managers.download_manager import DownloadManager
from managers.update_manager import UpdateManager

class AppAPI:
    def __init__(self):
        self.download_manager = DownloadManager(self)
        self.update_manager = UpdateManager(self)
        self._window = None

    def set_window(self, window):
        self._window = window

    def get_app_version(self) -> str:
        return "1.3.1"

    def get_platform(self) -> str:
        import platform
        return platform.system().lower()

    def open_folder(self, path: str) -> None:
        import subprocess
        system = self.get_platform()
        if system == 'win32':
            os.startfile(path)
        elif system == 'darwin':
            subprocess.Popen(['open', path])
        else:
            subprocess.Popen(['xdg-open', path])

    def pick_folder(self) -> str | None:
        result = self._window.create_file_dialog(
            webview.FOLDER_DIALOG,
            directory=str(Path.home() / 'Downloads')
        )
        return result[0] if result else None

    def minimize_window(self) -> None:
        self._window.minimize()

    def maximize_window(self) -> None:
        if self._window.maximized:
            self._window.restore()
        else:
            self._window.maximize()

    def close_window(self) -> None:
        self._window.destroy()

    def start_download(self, mod_id: int, url: str) -> None:
        asyncio.create_task(self.download_manager.start_download(mod_id, url))

    def cancel_download(self, mod_id: int) -> None:
        asyncio.create_task(self.download_manager.cancel_download(mod_id))

    def pause_download(self, mod_id: int) -> None:
        asyncio.create_task(self.download_manager.pause_download(mod_id))

    def resume_download(self, mod_id: int) -> None:
        asyncio.create_task(self.download_manager.resume_download(mod_id))

    def check_for_updates(self) -> str:
        return asyncio.create_task(self.update_manager.check_for_updates())

    def start_update_download(self, url: str) -> None:
        asyncio.create_task(self.update_manager.download_update(url))

if __name__ == '__main__':
    api = AppAPI()


    window = webview.create_window(
        title='Catarsys',
        url='https://catarsys.psychoware.ru',
        width=1280,
        height=800,
        min_size=(1024, 680),
        frameless=True,
        easy_drag=False,
        text_select=False,
        background_color='#0a0a0a',
        js_api=api,
    )
    api.set_window(window)
    webview.start(
        private_mode=False, gui='edgechromium', debug=True
    )
