# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Catarsys is a marketplace for GTA 5 roleplay mods (modifications). Users browse, purchase, download, and review mods. Authors publish mods; admins moderate them. The platform also has a Telegram bot for notifications and a PyWebView desktop client.

**Stack**: React 19 (Vite + TypeScript + Tailwind CSS) → FastAPI (Python 3.12) → MySQL + Redis | Bot: Aiogram 3 | Desktop: PyWebView

## Development Commands

### Frontend
```bash
npm run dev        # Vite dev server on port 3000
npm run build      # tsc -b && vite build
npm run lint       # ESLint
npm run preview    # Vite preview of built app
```

### Backend
```bash
cd backend
pip install -r requirements.txt   # install deps (fastapi, sqlalchemy, aiomysql, jose, passlib, httpx, pytest, etc.)
uvicorn app.main:app --reload --port 8001
```

### Testing (backend)
```bash
cd backend
pytest                          # all tests (SQLite-backed, auto-clean between tests)
pytest tests/test_auth.py       # single test file
pytest -k "test_login"          # single test by name
```

### Docker (full stack)
```bash
docker compose up -d --build                               # build & start all services
docker compose exec backend alembic upgrade head            # DB migrations
docker compose logs -f backend                              # service logs
docker compose down                                         # stop
```

## Project Structure

```
catarsys/
├── src/                          # React SPA (Vite + TypeScript + Tailwind)
│   ├── App.tsx                   # Root layout: Sidebar + Titlebar + page routing via uiStore.currentPage
│   ├── main.tsx                  # Entry point
│   ├── api/                      # API layer
│   │   ├── client.ts             # ApiClient class — fetch wrapper with auto token refresh, { success, data } unwrapping
│   │   ├── auth.ts               # Auth API calls
│   │   ├── mods.ts               # Mod CRUD calls
│   │   ├── payments.ts           # Payments/checkout calls
│   │   ├── users.ts, admin.ts, settings.ts, updates.ts
│   ├── components/
│   │   ├── auth/AuthModal.tsx    # Multi-step auth modal (login/register/verify/2fa)
│   │   ├── layout/Sidebar.tsx    # App sidebar with navigation
│   │   ├── layout/Titlebar.tsx   # Window titlebar + search
│   │   ├── mod/ModCard.tsx       # Mod listing card
│   │   ├── mod/ModDetailModal.tsx# Mod detail overlay
│   │   ├── mod/PublishModModal.tsx
│   │   ├── ui/                   # shadcn/ui components (~50 Radix-based primitives)
│   │   ├── profile/EditProfileModal.tsx
│   │   └── dynamic-island/       # macOS-style notification popup
│   ├── store/                    # Zustand stores
│   │   ├── uiStore.ts            # currentPage, sidebarCollapsed, authModal state
│   │   ├── authStore.ts          # JWT auth, profile, token management, avatar caching
│   │   ├── cartStore.ts          # Cart items, promo codes, checkout
│   │   ├── modStore.ts, favoriteStore.ts, downloadStore.ts, notificationStore.ts, themeStore.ts, adminStore.ts
│   ├── types/index.ts            # Shared TypeScript interfaces (Mod, User, Purchase, CartItem, etc.)
│   ├── pages/                    # Page components routed by uiStore.currentPage
│   │   ├── HomePage.tsx, ProfilePage.tsx, CartPage.tsx, DownloadsPage.tsx, FavoritesPage.tsx
│   │   ├── SettingsPage.tsx, CreditsPage.tsx, AdminPage.tsx
│   └── data/mock.ts             # Mock data for offline development
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app: CORS, router includes, lifespan
│   │   ├── api/v1/               # Route handlers (FastAPI routers)
│   │   │   ├── auth.py          # Register, login, verify-email, 2FA, refresh, logout, forgot/reset password, profile
│   │   │   ├── mods.py          # Mod CRUD, search, browse, reviews, favorites
│   │   │   ├── users.py         # User profiles
│   │   │   ├── payments.py      # Checkout, transactions, withdrawals
│   │   │   ├── media.py         # File uploads
│   │   │   ├── settings.py      # User settings
│   │   │   ├── admin.py         # Admin panel: stats, mod moderation, user management
│   │   │   ├── notifications.py # Notification CRUD, WebSocket push
│   │   │   ├── ws.py            # WebSocket connection handler
│   │   │   └── updates.py       # App update endpoints
│   │   ├── core/
│   │   │   ├── config.py        # Pydantic Settings from .env (DB, JWT, SMTP, Telegram, CORS)
│   │   │   ├── database.py      # SQLAlchemy async engine + session factory
│   │   │   ├── security.py      # JWT encode/decode helpers
│   │   │   └── dependencies.py  # FastAPI DI: get_current_user, get_current_admin, get_current_moderator
│   │   ├── models/              # SQLAlchemy ORM models (User, Mod, Review, Purchase, Transaction, etc.)
│   │   ├── schemas/             # Pydantic schemas for serialization
│   │   ├── services/            # Business logic layer
│   │   ├── repositories/        # DB query layer
│   │   ├── tasks/               # APScheduler periodic tasks (cleanup, scheduler)
│   │   └── websocket/           # WebSocket connection manager
│   └── tests/
│       ├── conftest.py          # SQLite-backed test setup + fixtures (test_user, test_admin, auth_headers, test_mod, etc.)
│       ├── test_auth.py, test_mods.py, test_users.py, test_payments.py, test_admin.py, test_settings.py, test_media.py
├── bot/                         # Telegram bot (Aiogram 3)
│   ├── main.py                  # Bot init with proxy + Redis storage + middleware
│   ├── handlers/                # start, notifications, subscription, media_partner handlers
│   ├── middlewares/auth.py      # Auth middleware
│   └── services/api_client.py  # HTTP client to backend API
├── desktop/                     # PyWebView desktop wrapper
│   ├── app.py                   # Frameless window + JS API bridge (download manager, update manager, window controls)
│   ├── managers/download_manager.py, update_manager.py
├── docker/
│   ├── nginx/nginx.conf         # Production nginx: SSL, HTTP→HTTPS, /api/ → backend, / → SPA
│   └── mysql/                   # MySQL config
├── docker-compose.yml           # Production: nginx + frontend + backend + bot + redis
└── Dockerfile                   # Frontend build (node → nginx multi-stage)
```

## Key Architecture Decisions

### State Management (Frontend)
- **Zustand** for all global state: ui, auth, cart, favorites, downloads, notifications, admin, mod filtering, theme
- No React Router — page switching is done via `uiStore.currentPage` with Framer Motion AnimatePresence
- Theme applied via `themeStore` import in `main.tsx` to avoid flash of wrong theme
- Avatar cached in localStorage per user ID (backend doesn't persist avatars yet)

### API Layer
- `ApiClient` class in `client.ts`: all requests go through one `request()` method
- Auto-refresh on 401: catches expired access tokens, calls `/auth/refresh`, retries once
- Response format: expects `{ success: true, data: ... }` — unicorns `data` field on success; throws `ApiError` with `.status` and `.code` on failure
- API base defaults to `/api/v1`, overridable via `VITE_API_URL` env var
- Mixed-content protection: auto-upgrades API URLs from http:// to https:// when the page is served over HTTPS

### Backend Pattern
- Routes in `api/v1/` — each file is a FastAPI `APIRouter`
- Heavy use of raw SQL via `sqlalchemy.text()` rather than ORM query builders — most endpoints execute raw `INSERT/SELECT/UPDATE` with named params
- Auth: JWT access tokens (15 min) + refresh tokens (30 days), stored in `refresh_tokens` table with revocation
- 2FA: email-based 6-digit codes stored in `email_verifications` table with `purpose='2fa'`
- Dependencies (`core/dependencies.py`): `get_current_user`, `get_current_admin`, `get_current_moderator` — role-check via FastAPI DI
- Settings from environment via `pydantic-settings` + `.env` file
- Database: MySQL via `aiomysql` + `sqlalchemy[asyncio]`, connection pool: 10/20

### Testing
- Backend tests use file-based SQLite (not in-memory, to avoid per-connection isolation issues)
- `conftest.py` patches several endpoints for SQLite compatibility (search, admin stats) by replacing route handlers
- Fixtures: `test_user`, `test_admin`, `test_mod`, `test_paid_mod`, `test_pending_mod`, `auth_headers`, `admin_headers`
- Test app is a standalone FastAPI instance with dependency overrides — not the production app
- Each test run: create SQLite DB → create all tables → run tests (auto-clean between tests) → delete DB file

### Telegram Bot
- Aiogram 3 with Redis FSM storage, SOCKS5 proxy support
- Handlers: start, notifications, subscription, media partner
- Auth middleware checks JWT tokens before allowing bot commands

### Desktop App
- PyWebView frameless window loading the production frontend URL
- JS API bridge via `js_api`: download management, update checking, window controls, folder picker
- Downloads: Python `httpx` async client with resume support
- Update manager: checks `https://catarsys.psychoware.ru/api/v1/app/updates/latest` for new versions, downloads + extracts installer
- Uses Edge Chromium renderer on Windows

### Docker
- Multi-stage frontend Dockerfile: `npm ci` → `npm run build` → nginx-alpine serving `/usr/share/nginx/html`
- Nginx config: HTTPS with Let's Encrypt, reverse proxy `/api/` to backend, `/ws/` with Upgrade headers, SPA fallback
- Backend connects to MySQL via `host.docker.internal` (not a Docker service)
- Bot uses proxy for Telegram connectivity

### Mod Status Lifecycle
`draft` → `pending` → `approved` | `rejected` | `banned`

Categories: `redux`, `gun_pack`, `clothes`, `vehicle`, `effects`, `other`
Projects: `gta5rp`, `majestic`, `universal`
