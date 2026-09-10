#!/usr/bin/env bash
# Сборка десктопного приложения Catarsys через Nuitka.
#
# Результат: dist/desktop/Catarsys.exe — самодостаточный .exe с фронтендом внутри.
#
# Предварительные требования:
#   - Python 3.12+
#   - node / npm
#   - pip install -r desktop/requirements.txt
#   - pip install nuitka
#   - pip install ordered-set zstandard patchelf  (доп. зависимости nuitka)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT"
DESKTOP_DIR="$ROOT/desktop"
DIST_DIR="$DESKTOP_DIR/dist"
OUT_DIR="$DESKTOP_DIR/dist/out"

# 1. Собираем frontend (vite build → dist/ в корне проекта)
echo "=== Building frontend ==="
cd "$FRONTEND_DIR"
npm ci
npm run build

FRONTEND_DIST="$FRONTEND_DIR/dist"
if [ ! -f "$FRONTEND_DIST/index.html" ]; then
    echo "ERROR: dist/index.html not found. Frontend build failed."
    exit 1
fi

# 2. Копируем в desktop/dist для Nuitka
echo "=== Copying frontend to desktop/dist ==="
rm -rf "$DIST_DIR"
cp -r "$FRONTEND_DIST" "$DIST_DIR"

echo "=== Frontend built: $(find "$DIST_DIR" -type f | wc -l) files ==="

# 2. Опционально: иконка для .exe (если есть)
ICON_PATH=""
if [ -f "$ROOT/public/favicon.ico" ]; then
    ICON_PATH="--windows-icon-from-ico=$ROOT/public/favicon.ico"
elif [ -f "$DESKTOP_DIR/icon.ico" ]; then
    ICON_PATH="--windows-icon-from-ico=$DESKTOP_DIR/icon.ico"
fi

# 3. Компилируем Nuitka
echo "=== Compiling with Nuitka ==="
cd "$DESKTOP_DIR"

python -m nuitka \
    --standalone \
    --onefile \
    --windows-console-mode=disable \
    --windows-company-name="Catarsys" \
    --windows-product-name="Catarsys" \
    --windows-file-version="1.3.1" \
    --windows-product-version="1.3.1" \
    --windows-file-description="Catarsys Desktop" \
    --include-data-dir="$DIST_DIR"=dist \
    --include-package=aiohttp \
    --include-package=pywebview \
    --include-package=httpx \
    --output-dir="$OUT_DIR" \
    --output-filename=Catarsys \
    ${ICON_PATH} \
    app.py

echo ""
echo "=== Build complete ==="
echo "Output: $OUT_DIR/Catarsys.exe"
echo ""
echo "Для дистрибуции достаточно одного файла Catarsys.exe"
echo "Фронтенд и Python-интерпретаттор уже в него впакованы."
