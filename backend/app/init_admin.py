"""
Инициализация первого админа при развёртывании.

Запуск:
  docker compose exec backend python app/init_admin.py devnyash
  # или локально:
  cd backend && python -m app.init_admin.py devnyash

Скрипт:
  - находит пользователя по username
  - если не найден — предлагает создать
  - выдаёт роль admin (или superadmin при необходимости)
"""

import asyncio
import sys
from pathlib import Path
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Добавляем backend в sys.path, чтобы импортировать app.*
sys.path.insert(0, str(Path(__file__).parent.parent))
from app.core.config import settings


async def init_admin(username: str, role: str = "admin") -> None:
    """Выдаёт роль admin/superadmin пользователю по username."""
    db_url = settings.DATABASE_URL
    print(f"[init_admin] Подключение к БД: {db_url.split('@')[-1] if '@' in db_url else db_url}")

    engine = create_async_engine(db_url, echo=False)

    async with engine.begin() as conn:
        # Проверяем существование пользователя
        result = await conn.execute(
            text("SELECT id, username, role FROM users WHERE username = :un"),
            {"un": username},
        )
        user = result.one_or_none()

        if not user:
            print(f"[init_admin] Пользователь '{username}' не найден.")
            print(f"[init_admin] Зарегистрируйтесь через Telegram, затем запустите скрипт снова.")
            return

        user_id, current_username, current_role = user
        print(f"[init_admin] Найден: id={user_id}, username={current_username}, role={current_role}")

        if current_role in ("admin", "superadmin"):
            print(f"[init_admin] У пользователя уже роль '{current_role}'. Ничего не делаем.")
            return

        # Выдаём роль
        await conn.execute(
            text("UPDATE users SET role = :role, updated_at = NOW() WHERE id = :uid"),
            {"role": role, "uid": user_id},
        )
        print(f"[init_admin] ✅ Роль '{role}' выдана пользователю '{username}' (id={user_id})")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Использование: python init_admin.py <username> [admin|superadmin]")
        print("Пример: python init_admin.py devnyash admin")
        sys.exit(1)

    target_username = sys.argv[1]
    target_role = sys.argv[2] if len(sys.argv) > 2 else "admin"

    if target_role not in ("admin", "superadmin"):
        print(f"[init_admin] Неверная роль '{target_role}'. Допустимо: admin, superadmin")
        sys.exit(1)

    asyncio.run(init_admin(target_username, target_role))
