"""
Native WinUI3 — Transparent window with Acrylic blur, NO WebView2
Run: python winui3_native.py
"""
import ctypes
from ctypes import wintypes
import sys

# ── DWM Constants for Acrylic ───────────────────────────────────────
DWMWA_SYSTEMBACKDROP_TYPE = 38
DWMSBT_MAINWINDOW = 2
DWMSBT_TRANSIENTWINDOW = 3
DWMSBT_TABBEDWINDOW = 4

# ── WinRT Imports ───────────────────────────────────────────────────
from System import Guid
from Microsoft.UI.Windowing import AppWindow, DisplayArea, DisplayAreaFallback
from Microsoft.UI.Dispatching import DispatcherQueueController
from Microsoft.UI.Xaml import (
    Window as XamlWindow, Application, LaunchActivatedEventArgs,
    HorizontalAlignment, VerticalAlignment, Visibility
)
from Microsoft.UI.Xaml.Controls import (
    Grid, Button, TextBlock, StackPanel, CheckBox, Slider, ToggleSwitch,
    MenuBar, ProgressBar
)
from Microsoft.UI.Xaml.Media import SolidColorBrush, AcrylicBrush, BackdropMaterial
from Microsoft.UI import Colors as UIColors
from Microsoft.UI.Xaml import Thickness, CornerRadius


# ── 1. Get system accent color ──────────────────────────────────────
def get_accent_color() -> tuple:
    try:
        from Windows.UI.ViewSettings import UISettings
        ui = UISettings()
        accent = ui.get_color_value(0)
        return (accent.R, accent.G, accent.B)
    except Exception:
        import winreg
        try:
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\DWM")
            val, _ = winreg.QueryValueEx(key, "ColorizationColor")
            winreg.CloseKey(key)
            return ((val >> 16) & 0xFF, (val >> 8) & 0xFF, val & 0xFF)
        except Exception:
            return (0, 120, 212)


accent = get_accent_color()
accent_hex = f"#{accent[0]:02X}{accent[1]:02X}{accent[2]:02X}"
print(f"[Info] Accent color: {accent_hex}")


# ── 2. Create the WinUI3 Application ───────────────────────────────
class App(Application):
    def __init__(self):
        self.window = None

    def on_launched(self, args: LaunchActivatedEventArgs):
        self.window = XamlWindow()
        self.window.title = "WinUI3 Native — Acrylic Blur"
        self._build_content()
        self.window.activate()
        self._apply_acrylic()

    def _build_content(self):
        root = Grid()
        root.padding = Thickness(48, 40, 48, 40)

        # Title
        title = TextBlock()
        title.text = "WinUI3 Native"
        title.font_size = 36
        title.font_weight = 700
        title.foreground = SolidColorBrush(UIColors.white())
        title.margin = Thickness(0, 0, 0, 8)

        # Subtitle
        subtitle = TextBlock()
        subtitle.text = "Acrylic blur · Transparent window · No WebView2"
        subtitle.font_size = 14
        subtitle.foreground = SolidColorBrush(UIColors.white())
        subtitle.opacity = 0.7
        subtitle.margin = Thickness(0, 0, 0, 36)

        # Cards container
        cards = StackPanel()
        cards.orientation = 0  # 0=Horizontal, 1=Vertical
        cards.spacing = 16

        # Card 1: Accent Color
        card1 = self._create_card()
        # ... add content

        self.window.content = root

    def _create_card(self):
        card = Grid()
        card.background = SolidColorBrush(UIColors.white())
        card.opacity = 0.12
        card.corner_radius = CornerRadius(16)
        card.padding = Thickness(24)
        card.width = 220
        card.height = 160
        return card

    def _apply_acrylic(self):
        """Apply Acrylic via XAML Window.SystemBackdrop (WinUI3 1.4+)"""
        try:
            # WinUI3 1.4+ supports Window.SystemBackdrop
            from Microsoft.UI.Xaml.Media import DesktopAcrylicBackdrop
            self.window.system_backdrop = DesktopAcrylicBackdrop()
            print("[Acrylic] Applied via Window.SystemBackdrop")
        except Exception as e:
            print(f"[Acrylic] XAML method failed: {e}")
            # Fallback to DWM API
            try:
                hwnd = ctypes.windll.user32.FindWindowW(None, self.window.title)
                if hwnd:
                    backdrop_type = DWMSBT_TRANSIENTWINDOW
                    ctypes.windll.dwmapi.DwmSetWindowAttribute(
                        hwnd, DWMWA_SYSTEMBACKDROP_TYPE,
                        ctypes.byref(ctypes.c_int(backdrop_type)),
                        ctypes.sizeof(ctypes.c_int)
                    )
                    print("[Acrylic] Applied via DWM API")
            except Exception as e2:
                print(f"[Acrylic] DWM fallback failed: {e2}")


# ── 3. Run ──────────────────────────────────────────────────────────
if __name__ == '__main__':
    app = App()
    app.run()
