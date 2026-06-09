# Catarsys — Развёртывание на VDS

Полная инструкция по развёртыванию продакшен-версии на Ubuntu 22.04+ VDS.

---

## 1. Подготовка сервера

```bash
# Обновление пакетов
sudo apt update && sudo apt upgrade -y

# Установка Docker и Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Выйти и зайти заново (или newgrp docker)

# Установка Git
sudo apt install git -y

# Клонирование репозитория
git clone https://github.com/ваш-username/catarsys.git
cd catarsys
```

---

## 2. Настройка SSL (Let's Encrypt)

```bash
# Установка Certbot
sudo apt install certbot -y

# Получение сертификата (до запуска контейнеров, на открытый 80 порт)
sudo certbot certonly --standalone -d catarsys.psychoware.ru 

# Создание папки для сертификатов в проекте
mkdir -p docker/nginx/ssl

# Копирование сертификатов
sudo cp /etc/letsencrypt/live/catarsys.psychoware.ru/fullchain.pem docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/catarsys.psychoware.ru/privkey.pem docker/nginx/ssl/
sudo chmod 644 docker/nginx/ssl/*.pem

# Автообновление сертификатов (добавить в crontab)
crontab -e
# Добавить строку:
# 0 3 * * * certbot renew --quiet && docker exec catarsys-nginx-1 nginx -s reload
```

---

## 3. Nginx конфиг с SSL

**`docker/nginx/nginx.conf`** — полный рабочий конфиг:

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml application/xml+rss text/javascript
               image/svg+xml;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_vary on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # HTTP → HTTPS редирект
    server {
        listen 80;
        server_name catarsys.psychoware.ru
        return 301 https://$host$request_uri;
    }

    # HTTPS сервер
    server {
        listen 443 ssl http2;
        server_name catarsys.psychoware.ru

        ssl_certificate     /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache   shared:SSL:10m;
        ssl_session_timeout 10m;

        # Статика (кеш на год)
        location /assets/ {
            proxy_pass http://frontend:3000;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # API запросы
        location /api/ {
            proxy_pass http://backend:8001;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket
        location /ws/ {
            proxy_pass http://backend:8001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 86400;
        }

        # Swagger/ReDoc
        location /docs {
            proxy_pass http://backend:8001;
            proxy_set_header Host $host;
        }

        location /redoc {
            proxy_pass http://backend:8001;
            proxy_set_header Host $host;
        }

        location /openapi.json {
            proxy_pass http://backend:8001;
            proxy_set_header Host $host;
        }

        # Фронтенд (SPA — всё остальное)
        location / {
            proxy_pass http://frontend:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            add_header Cache-Control "no-cache, must-revalidate";
        }
    }
}
```

---

## 4. Переменные окружения

Создать **`.env`** в корне проекта:

```env
# MySQL
MYSQL_ROOT_PASSWORD=supersecret_root_password
MYSQL_PASSWORD=catarsys_db_password

# JWT
SECRET_KEY=ваш-секретный-ключ-64-символа-минимум

# SMTP (для писем подтверждения)
SMTP_HOST=smtp.yandex.com
SMTP_PORT=465
SMTP_USER=noreply@catarsys.psychoware.ru
SMTP_PASSWORD=ваш-пароль-от-почты

# Telegram
TELEGRAM_BOT_TOKEN=ваш-токен-бота

# Домен (CORS)
CORS_ORIGINS=https://catarsys.psychoware.ru
```

---

## 5. Запуск

```bash
# Сборка и запуск всех сервисов
docker compose -f docker-compose.yml up -d --build

# Проверка логов
docker compose -f docker-compose.yml logs -f

# Проверка статуса
docker compose -f docker-compose.yml ps
```

### После запуска

```bash
# Миграции БД (из контейнера backend)
docker compose -f docker-compose.yml exec backend alembic upgrade head

# Создание SuperAdmin (выполнить в Python консоли)
docker compose -f docker-compose.yml exec backend python -c "
import asyncio
from app.core.database import AsyncSession, engine
from app.models.user import User
from app.core.security import hash_password

async def create_admin():
    async with AsyncSession(engine) as db:
        exists = await db.get(User, 1)
        if exists:
            print('Admin already exists')
            return
        admin = User(
            email='eban@gmail.com',
            username='devnyash',
            password_hash=hash_password('Sozolo0375'),
            is_verified=True,
            is_active=True,
            role='superadmin',
            balance=0
        )
        db.add(admin)
        await db.commit()
        print(f'SuperAdmin created: associalpersonalitydisorder@gmail.com / Sozolo0375')

asyncio.run(create_admin())
"
```

---

## 6. Обновление продакшена

```bash
# Зайти на сервер, перейти в папку проекта
cd ~/catarsys

# Стянуть изменения
git pull origin main

# Пересобрать и перезапустить
docker compose -f docker-compose.yml up -d --build

# Применить миграции
docker compose -f docker-compose.yml exec backend alembic upgrade head
```

Можно автоматизировать через GitHub Actions (`.github/workflows/deploy.yml`) — при пуше в `main` автоматом билдит и деплоит.

---

## 7. Команды управления

```bash
# Статус всех сервисов
docker compose -f docker-compose.yml ps

# Логи конкретного сервиса
docker compose -f docker-compose.yml logs -f backend
docker compose -f docker-compose.yml logs -f nginx
docker compose -f docker-compose.yml logs -f bot

# Рестарт одного сервиса
docker compose -f docker-compose.yml restart backend

# Остановка всего
docker compose -f docker-compose.yml down

# Остановка с удалением томов (осторожно — удалит БД)
docker compose -f docker-compose.yml down -v

# Зайти в контейнер
docker compose -f docker-compose.yml exec backend bash
docker compose -f docker-compose.yml exec mysql mysql -u root -p
```

---

## 8. Бэкапы БД

```bash
# Создать бэкап
docker compose -f docker-compose.yml exec -T mysql \
  mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" catarsys \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановить
cat backup.sql | docker compose -f docker-compose.yml exec -T mysql \
  mysql -u root -p"$MYSQL_ROOT_PASSWORD" catarsys

# Добавить в crontab ежедневный бэкап
# 0 4 * * * cd ~/catarsys && docker compose exec -T mysql mysqldump -u root -p"..." catarsys > ~/backups/daily/$(date +\%Y\%m\%d).sql && find ~/backups/daily -type f -mtime +30 -delete
```

---

## 9. Структура проекта

```
catarsys/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── api/v1/       # Роуты (auth, mods, users, payments, ...)
│   │   ├── core/         # Config, database, security, dependencies
│   │   ├── models/       # SQLAlchemy модели
│   │   ├── schemas/      # Pydantic схемы
│   │   ├── services/     # Бизнес-логика
│   │   ├── repositories/ # Слой БД
│   │   ├── tasks/        # APScheduler задачи
│   │   └── websocket/    # WebSocket менеджер
│   ├── tests/            # 124 теста (pytest)
│   └── Dockerfile
├── desktop/              # PyWebView обёртка
├── bot/                  # Telegram бот (Aiogram 3)
├── src/                  # React SPA (Vite + TypeScript)
├── docker/
│   ├── nginx/            # Nginx конфиг + SSL
│   └── mysql/            # MySQL конфиг
├── docker-compose.yml          # Локальная разработка
├── docker-compose.yml     # Продакшен
└── .github/workflows/          # CI/CD
```

---

## 10. API

После развёртывания:

| Сервис | URL |
|--------|-----|
| Frontend | `https://catarsys.psychoware.ru` |
| API | `https://catarsys.psychoware.ru/api/v1` |
| Swagger | `https://catarsys.psychoware.ru/docs` |
| ReDoc | `https://catarsys.psychoware.ru/redoc` |
| WebSocket | `wss://catarsys.psychoware.ru/ws/notifications` |

---

## 11. Требования к VDS

| Ресурс | Минимум | Рекомендуется |
|--------|---------|--------------|
| CPU | 2 ядра | 4 ядра |
| RAM | 4 GB | 8 GB |
| Диск | 20 GB SSD | 50 GB SSD |
| ОС | Ubuntu 22.04 | Ubuntu 24.04 |
| Порты | 80, 443 | 80, 443 |

---

## 12. Локальная разработка

```bash
# Фронтенд
npm install
npm run dev          # → http://localhost:5173

# Бэкенд
cd backend
python -m venv venv
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001  # → http://localhost:8001

# Docker Compose (полный стек)
docker compose up -d
```
