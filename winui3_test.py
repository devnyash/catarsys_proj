"""
WinUI3 pywebview — Rounded corners, Mica backdrop, Accent color
Run: python winui3_test.py
"""
import webview


def get_accent_color() -> str:
    """Get system accent color from WinRT UISettings"""
    try:
        from Windows.UI.ViewSettings import UISettings
        ui = UISettings()
        accent = ui.get_color_value(0)
        return f"#{accent.R:02X}{accent.G:02X}{accent.B:02X}"
    except Exception:
        import winreg
        try:
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\DWM")
            val, _ = winreg.QueryValueEx(key, "ColorizationColor")
            winreg.CloseKey(key)
            r, g, b = (val >> 16) & 0xFF, (val >> 8) & 0xFF, val & 0xFF
            return f"#{r:02X}{g:02X}{b:02X}"
        except Exception:
            return "#0078D4"


accent_hex = get_accent_color()
print(f"[Info] Accent color: {accent_hex}")

HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>WinUI3 Test</title>
<style>
  :root {{
    --accent: {accent_hex};
    --accent-light: color-mix(in srgb, {accent_hex} 30%, transparent);
  }}

  * {{ box-sizing: border-box; margin: 0; padding: 0; }}

  body {{
    font-family: 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif;
    min-height: 100vh;
    padding: 48px 40px;
    background: #1e1e1e;
    color: #f0f0f0;
    overflow: hidden;
  }}

  .title {{
    font-size: 32px;
    font-weight: 700;
    letter-spacing: -0.5px;
    margin-bottom: 8px;
  }}

  .subtitle {{
    font-size: 14px;
    color: #999;
    margin-bottom: 32px;
  }}

  .grid {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
    max-width: 900px;
  }}

  .card {{
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 16px;
    padding: 24px;
    transition: transform 0.2s, background 0.2s;
  }}

  .card:hover {{
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.10);
  }}

  .card h3 {{
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #888;
    margin-bottom: 16px;
  }}

  .accent-swatch {{
    width: 100%;
    height: 80px;
    border-radius: 12px;
    background: var(--accent);
    margin-bottom: 12px;
    box-shadow: 0 4px 16px var(--accent-light);
  }}

  .accent-info {{
    font-family: 'Cascadia Code', 'Consolas', monospace;
    font-size: 13px;
    color: #ccc;
  }}

  .btn {{
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    margin: 4px;
  }}

  .btn-primary {{
    background: var(--accent);
    color: white;
  }}

  .btn-primary:hover {{ filter: brightness(1.1); }}

  .btn-secondary {{
    background: rgba(255,255,255,0.08);
    color: #ddd;
    border: 1px solid rgba(255,255,255,0.12);
  }}

  .btn-ghost {{
    background: transparent;
    color: #aaa;
  }}

  .btn-ghost:hover {{ background: rgba(255,255,255,0.06); }}

  input[type="checkbox"] {{
    accent-color: var(--accent);
    width: 18px;
    height: 18px;
    vertical-align: middle;
    margin-right: 8px;
  }}

  input[type="range"] {{
    accent-color: var(--accent);
    width: 100%;
    margin: 8px 0;
  }}

  a {{
    color: var(--accent);
    text-decoration: none;
  }}

  a:hover {{ text-decoration: underline; }}

  .toggle {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
  }}

  .toggle-switch {{
    width: 44px;
    height: 24px;
    background: #444;
    border-radius: 12px;
    position: relative;
    cursor: pointer;
    transition: background 0.2s;
  }}

  .toggle-switch.active {{
    background: var(--accent);
  }}

  .toggle-switch::after {{
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    top: 2px;
    left: 2px;
    transition: transform 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }}

  .toggle-switch.active::after {{
    transform: translateX(20px);
  }}

  .status {{
    position: fixed;
    bottom: 16px;
    right: 16px;
    font-size: 11px;
    color: #555;
    font-family: monospace;
  }}
</style>
</head>
<body>

<div class="title">WinUI3 Test</div>
<div class="subtitle">Rounded corners · Mica backdrop · Accent colors</div>

<div class="grid">
  <div class="card">
    <h3>Accent Color</h3>
    <div class="accent-swatch"></div>
    <div class="accent-info">{accent_hex}</div>
    <p style="margin-top:12px;font-size:13px;color:#777;">
      System accent from UISettings
    </p>
  </div>

  <div class="card">
    <h3>Buttons</h3>
    <button class="btn btn-primary" onclick="window.pywebview.api.hello()">Primary</button>
    <button class="btn btn-secondary">Secondary</button>
    <button class="btn btn-ghost">Ghost</button>
  </div>

  <div class="card">
    <h3>Controls</h3>
    <p><input type="checkbox" checked> Checkbox</p>
    <p style="margin-top:8px;"><input type="checkbox"> Unchecked</p>
    <p style="margin-top:12px;"><input type="range" min="0" max="100" value="65"></p>
    <p style="font-size:13px;"><a href="https://github.com/r0x0r/pywebview">pywebview →</a></p>
  </div>

  <div class="card">
    <h3>Toggles</h3>
    <div class="toggle">
      <span>Dark mode</span>
      <div class="toggle-switch active" onclick="this.classList.toggle('active')"></div>
    </div>
    <div class="toggle">
      <span>Notifications</span>
      <div class="toggle-switch" onclick="this.classList.toggle('active')"></div>
    </div>
    <div class="toggle">
      <span>Auto-update</span>
      <div class="toggle-switch active" onclick="this.classList.toggle('active')"></div>
    </div>
  </div>
</div>

<div class="status" id="status">WinUI3 / WebView2</div>

<script>
  document.getElementById('status').textContent =
    'Backend: WinUI3 | Accent: ' + '{accent_hex}';
</script>

</body>
</html>"""


class Api:
    def hello(self):
        print("[JS→Python] Hello!")
        return "Hello from Python!"


def main():
    window = webview.create_window(
        'WinUI3 Test — Rounded Corners · Mica · Accent',
        html=HTML,
        js_api=Api(),
        width=900,
        height=680,
        min_size=(600, 500),
    )

    print("[Info] Starting WinUI3 backend...")
    print("[Info] Close window to exit.")
    webview.start(gui='winui3')


if __name__ == '__main__':
    main()
