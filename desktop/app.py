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
        self._maximized = False
        self._saved_rect = None

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

    def maximize_window(self) -> bool:
        import platform

        if platform.system() != 'win32':
            # Non-Windows: use native maximize/restore
            self._window.maximize() if not self._maximized else self._window.restore()
            self._maximized = not self._maximized
            return self._maximized

        try:
            import ctypes
            from ctypes import wintypes

            hwnd = self._window._hwnd
            GWL_STYLE = -16

            if self._maximized:
                # Restore: remove WS_MAXIMIZE, give back WS_POPUP for frameless look
                ctypes.windll.user32.ShowWindow(hwnd, 9)  # SW_RESTORE
                self._maximized = False
                return False

            # ---- Maximize ----
            # Frameless windows use WS_POPUP which maximizes fullscreen
            # (covering the taskbar). We temporarily add WS_CAPTION so
            # ShowWindow(SW_MAXIMIZE) respects the taskbar work area.
            WS_POPUP = 0x80000000
            WS_CAPTION = 0x00C00000

            style = ctypes.windll.user32.GetWindowLongW(hwnd, GWL_STYLE)
            # Replace WS_POPUP with WS_CAPTION so window looks "normal" to Windows
            new_style = (style & ~WS_POPUP) | WS_CAPTION
            ctypes.windll.user32.SetWindowLongW(hwnd, GWL_STYLE, new_style)
            ctypes.windll.user32.SetWindowPos(
                hwnd, 0, 0, 0, 0, 0,
                0x0020 | 0x0002 | 0x0001  # SWP_FRAMECHANGED | SWP_NOMOVE | SWP_NOSIZE
            )

            # Now maximize — Windows will respect the taskbar
            ctypes.windll.user32.ShowWindow(hwnd, 3)  # SW_MAXIMIZE

            # Remove the caption back — just change the style without recalculating
            # the frame (that would undo the work-area size).
            style = ctypes.windll.user32.GetWindowLongW(hwnd, GWL_STYLE)
            ctypes.windll.user32.SetWindowLongW(hwnd, GWL_STYLE, style & ~WS_CAPTION)

            self._maximized = True
            return True

        except Exception as exc:
            print(f"[maximize_window] fallback ({exc})")
            self._window.maximize() if not self._maximized else self._window.restore()
            self._maximized = not self._maximized
            return self._maximized

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
