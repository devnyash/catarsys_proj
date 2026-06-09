import asyncio
import os
import sqlite3
import tempfile
from datetime import datetime, timedelta, timezone
from typing import AsyncGenerator

import jwt
import pytest
import pytest_asyncio
from fastapi import FastAPI, Depends, HTTPException, Query, Request
from httpx import AsyncClient, ASGITransport
from jose import JWTError
from passlib.context import CryptContext
from sqlalchemy import text, event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_admin

sqlite3.register_converter("timestamp", lambda x: datetime.strptime(x.decode() if isinstance(x, bytes) else x, "%Y-%m-%d %H:%M:%S"))
sqlite3.register_converter("TIMESTAMP", lambda x: datetime.strptime(x.decode() if isinstance(x, bytes) else x, "%Y-%m-%d %H:%M:%S"))

# ---- Patch auth module SECRET_KEY to match settings ----
import app.api.v1.auth as auth_module
auth_module.SECRET_KEY = settings.SECRET_KEY
auth_module.ALGORITHM = settings.ALGORITHM

# ---- Use file-based SQLite to avoid per-connection in-memory isolation ----
_db_file = os.path.join(tempfile.gettempdir(), f"catarsys_test_{os.urandom(4).hex()}.db")
TEST_DB_URL = f"sqlite+aiosqlite:///{_db_file}"

test_engine = create_async_engine(TEST_DB_URL, poolclass=NullPool, echo=False, connect_args={"detect_types": sqlite3.PARSE_DECLTYPES})


@event.listens_for(test_engine.sync_engine, "connect")
def _register_sqlite_functions(dbapi_connection, connection_record):
    import datetime as dt
    def _now():
        return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    dbapi_connection.create_function("NOW", 0, _now)


test_async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    email_verified INTEGER NOT NULL DEFAULT 0,
    avatar_url VARCHAR(512),
    bio TEXT,
    is_banned INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    purpose VARCHAR(20),
    used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    project VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    subscription_price DECIMAL(10,2),
    file_url VARCHAR(512),
    cover_url VARCHAR(512),
    author_id INTEGER NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    is_pinned INTEGER NOT NULL DEFAULT 0,
    download_count INTEGER NOT NULL DEFAULT 0,
    average_rating DECIMAL(3,2) NOT NULL DEFAULT 0,
    rating_count INTEGER NOT NULL DEFAULT 0,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mod_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mod_id INTEGER NOT NULL REFERENCES mods(id),
    url VARCHAR(512) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mod_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    mod_id INTEGER NOT NULL REFERENCES mods(id),
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mod_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    mod_id INTEGER NOT NULL REFERENCES mods(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type VARCHAR(20) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50),
    payment_id VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    mod_id INTEGER NOT NULL REFERENCES mods(id),
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    mod_id INTEGER NOT NULL REFERENCES mods(id),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS downloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    mod_id INTEGER NOT NULL REFERENCES mods(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    key VARCHAR(50) NOT NULL,
    value TEXT NOT NULL,
    UNIQUE(user_id, key)
);

CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    mod_id INTEGER NOT NULL REFERENCES mods(id)
);

CREATE TABLE IF NOT EXISTS promo_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_percent INTEGER NOT NULL,
    max_uses INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMP,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    data TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount DECIMAL(12,2) NOT NULL,
    method VARCHAR(20) NOT NULL,
    address VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version VARCHAR(50) NOT NULL UNIQUE,
    file_url VARCHAR(512) NOT NULL,
    changelog TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_2fa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) UNIQUE,
    enabled INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ticket_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""

# ---- Patch search endpoint for SQLite compatibility ----
import app.api.v1.mods as mods_module

async def _search_mods_sqlite(
    q: str = Query(...),
    cursor: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    if len(q.strip()) < 1:
        raise HTTPException(status_code=422, detail={"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Query must be at least 1 character"}})
    words = q.strip().split()
    like_conditions = " OR ".join(f"m.title LIKE :w{i} OR m.description LIKE :wd{i}" for i in range(len(words)))
    params = {}
    for i, w in enumerate(words):
        params[f"w{i}"] = f"%{w}%"
        params[f"wd{i}"] = f"%{w}%"

    conditions = ["m.deleted_at IS NULL", "m.status = 'approved'", f"({like_conditions})"]

    if cursor:
        try:
            import json
            cursor_data = json.loads(cursor)
            cursor_val = cursor_data.get("value")
            cursor_id = cursor_data.get("id")
            if cursor_val is not None and cursor_id is not None:
                conditions.append("(m.id < :cursor_id)")
                params["cursor_id"] = cursor_id
        except Exception:
            pass

    where_clause = " AND ".join(conditions)
    query = text(f"""
        SELECT m.*, u.username AS author_username
        FROM mods m
        JOIN users u ON u.id = m.author_id
        WHERE {where_clause}
        ORDER BY m.id DESC
        LIMIT :limit
    """)
    params["limit"] = limit + 1

    result = await db.execute(query, params)
    rows = result.fetchall()

    has_more = len(rows) > limit
    if has_more:
        rows = rows[:limit]

    mods = []
    for r in rows:
        mods.append({
            "id": r.id,
            "title": r.title,
            "description": r.description,
            "category": r.category,
            "project": r.project,
            "author_id": r.author_id,
            "author_username": r.author_username,
            "price": float(r.price) if r.price else 0,
            "subscription_price": float(r.subscription_price) if r.subscription_price else None,
            "cover_url": r.cover_url,
            "status": r.status,
            "is_pinned": r.is_pinned,
            "download_count": r.download_count,
            "average_rating": float(r.average_rating) if r.average_rating else 0,
            "rating_count": r.rating_count,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        })

    next_cursor = None
    if has_more and rows:
        import json
        last = rows[-1]
        next_cursor = json.dumps({"value": last.id, "id": last.id})

    return {"success": True, "data": {"mods": mods, "next_cursor": next_cursor, "has_more": has_more}}


for route in mods_module.router.routes:
    if hasattr(route, "path") and route.path.rstrip("/") == "/mods/search":
        route.endpoint = _search_mods_sqlite
        break

# ---- Patch admin stats endpoint for SQLite compatibility ----
import app.api.v1.admin as admin_module


async def _get_platform_stats_sqlite(
    admin_id: int = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    user_count = await db.execute(text("SELECT COUNT(*) FROM users"))
    mod_count = await db.execute(text("SELECT COUNT(*) FROM mods WHERE deleted_at IS NULL"))
    pending_mods = await db.execute(text("SELECT COUNT(*) FROM mods WHERE status = 'pending' AND deleted_at IS NULL"))
    total_purchases = await db.execute(text("SELECT COUNT(*) FROM purchases"))
    total_revenue = await db.execute(text("SELECT COALESCE(SUM(amount), 0) FROM purchases"))
    active_subscriptions = await db.execute(text("SELECT COUNT(*) FROM subscriptions WHERE expires_at > NOW()"))
    open_tickets = await db.execute(text("SELECT COUNT(*) FROM tickets WHERE status IN ('open', 'in_progress')"))
    downloads_today = await db.execute(
        text("SELECT COUNT(*) FROM downloads WHERE date(created_at) = date('now')"),
    )

    return {
        "success": True,
        "data": {
            "total_users": user_count.scalar(),
            "total_mods": mod_count.scalar(),
            "pending_mods": pending_mods.scalar(),
            "total_purchases": total_purchases.scalar(),
            "total_revenue": float(total_revenue.scalar()),
            "active_subscriptions": active_subscriptions.scalar(),
            "open_tickets": open_tickets.scalar(),
            "downloads_today": downloads_today.scalar(),
        },
    }


for route in admin_module.router.routes:
    if hasattr(route, "path") and route.path.rstrip("/") == "/admin/stats":
        route.endpoint = _get_platform_stats_sqlite
        break

# ---- Create the FastAPI test app ----
from app.api.v1 import auth, mods, users, payments, media, settings as settings_router, updates, admin, ws
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.responses import JSONResponse

test_app = FastAPI(title="Catarsys API Test", version="1.0.0")


@test_app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc):
    if isinstance(exc.detail, dict):
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


test_app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
test_app.include_router(mods.router, prefix=settings.API_V1_PREFIX)
test_app.include_router(users.router, prefix=settings.API_V1_PREFIX)
test_app.include_router(payments.router, prefix=settings.API_V1_PREFIX)
test_app.include_router(media.router, prefix=settings.API_V1_PREFIX)
test_app.include_router(settings_router.router, prefix=settings.API_V1_PREFIX)
test_app.include_router(updates.router, prefix=settings.API_V1_PREFIX)
test_app.include_router(admin.router, prefix=settings.API_V1_PREFIX)
test_app.include_router(ws.router, prefix=settings.API_V1_PREFIX)


# ---- Dependency overrides ----
async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with test_async_session() as session:
        yield session
        await session.commit()


class MockUser(int):
    def __new__(cls, id, email, role, balance=1000, username=None):
        instance = super().__new__(cls, id)
        instance.id = id
        instance.email = email
        instance.username = username or (email.split("@")[0] if email else "user")
        instance.role = role
        instance.balance = balance
        instance.is_banned = False
        instance.is_active = True
        instance.email_verified = True
        return instance


from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.security import decode_token

_http_bearer = HTTPBearer(auto_error=True)


async def override_get_current_user(
    token: HTTPAuthorizationCredentials = Depends(_http_bearer),
):
    try:
        payload = decode_token(token.credentials)
    except ValueError:
        raise HTTPException(status_code=403, detail="Invalid or expired token")
    user_id = int(payload.get("sub"))
    return MockUser(
        id=user_id,
        email=payload.get("email"),
        role=payload.get("role", "user"),
        username=payload.get("username"),
    )


async def override_get_current_admin(
    token: HTTPAuthorizationCredentials = Depends(_http_bearer),
):
    try:
        payload = decode_token(token.credentials)
    except ValueError:
        raise HTTPException(status_code=403, detail="Invalid or expired token")
    role = payload.get("role")
    if role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Admin privileges required")
    user_id = int(payload.get("sub"))
    return MockUser(
        id=user_id,
        email=payload.get("email"),
        role=role,
        username=payload.get("username"),
    )


test_app.dependency_overrides[get_db] = override_get_db
test_app.dependency_overrides[get_current_user] = override_get_current_user
test_app.dependency_overrides[get_current_admin] = override_get_current_admin


# ---- Fixtures ----
@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def db_setup():
    async with test_engine.begin() as conn:
        for statement in CREATE_TABLES_SQL.split(";"):
            stmt = statement.strip()
            if stmt:
                await conn.execute(text(stmt))
    yield
    await test_engine.dispose()
    try:
        os.unlink(_db_file)
    except OSError:
        pass


@pytest_asyncio.fixture(autouse=True)
async def clean_db(db_setup):
    async with test_engine.begin() as conn:
        tables = [
            "users", "email_verifications", "refresh_tokens", "password_reset_tokens",
            "mods", "mod_images", "mod_ratings", "mod_favorites",
            "transactions", "purchases", "subscriptions", "downloads",
            "user_settings", "cart_items", "promo_codes", "notifications",
            "withdrawal_requests", "app_versions", "user_2fa",
            "tickets", "ticket_replies",
        ]
        for t in tables:
            await conn.execute(text(f"DELETE FROM {t}"))
    yield


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with test_async_session() as session:
        yield session


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> dict:
    hashed = pwd_ctx.hash("TestPass123")
    result = await db_session.execute(
        text("""
            INSERT INTO users (email, username, password_hash, role, balance, email_verified, created_at, updated_at)
            VALUES ('test@example.com', 'testuser', :pw, 'user', 1000, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
        """),
        {"pw": hashed},
    )
    uid = result.scalar()
    await db_session.commit()
    return {"id": uid, "email": "test@example.com", "username": "testuser", "role": "user", "balance": 1000}


@pytest_asyncio.fixture
async def test_admin(db_session: AsyncSession) -> dict:
    hashed = pwd_ctx.hash("AdminPass123")
    result = await db_session.execute(
        text("""
            INSERT INTO users (email, username, password_hash, role, balance, email_verified, created_at, updated_at)
            VALUES ('admin@example.com', 'adminuser', :pw, 'admin', 10000, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
        """),
        {"pw": hashed},
    )
    uid = result.scalar()
    await db_session.commit()
    return {"id": uid, "email": "admin@example.com", "username": "adminuser", "role": "admin", "balance": 10000}


@pytest_asyncio.fixture
async def auth_headers(test_user: dict) -> dict:
    now = datetime.now(timezone.utc)
    access_token = jwt.encode(
        {
            "sub": str(test_user["id"]),
            "email": test_user["email"],
            "role": test_user["role"],
            "exp": now + timedelta(hours=1),
            "type": "access",
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return {"Authorization": f"Bearer {access_token}"}


@pytest_asyncio.fixture
async def admin_headers(test_admin: dict) -> dict:
    now = datetime.now(timezone.utc)
    access_token = jwt.encode(
        {
            "sub": str(test_admin["id"]),
            "email": test_admin["email"],
            "role": test_admin["role"],
            "exp": now + timedelta(hours=1),
            "type": "access",
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return {"Authorization": f"Bearer {access_token}"}


@pytest_asyncio.fixture
async def test_mod(db_session: AsyncSession, test_user: dict) -> dict:
    result = await db_session.execute(
        text("""
            INSERT INTO mods (title, description, category, project, price, file_url, author_id, status, download_count, average_rating, rating_count, is_pinned, created_at, updated_at)
            VALUES ('Test Mod', 'A test mod description', 'redux', 'gta5rp', 0.0, 'http://files.test/mod.zip', :uid, 'approved', 0, 0.0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
        """),
        {"uid": test_user["id"]},
    )
    mid = result.scalar()
    await db_session.commit()
    return {"id": mid, "title": "Test Mod", "author_id": test_user["id"]}


@pytest_asyncio.fixture
async def test_pending_mod(db_session: AsyncSession, test_user: dict) -> dict:
    result = await db_session.execute(
        text("""
            INSERT INTO mods (title, description, category, project, price, file_url, author_id, status, download_count, average_rating, rating_count, is_pinned, created_at, updated_at)
            VALUES ('Pending Mod', 'A pending mod', 'effects', 'gta5rp', 0.0, 'http://files.test/pending.zip', :uid, 'pending', 0, 0.0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
        """),
        {"uid": test_user["id"]},
    )
    mid = result.scalar()
    await db_session.commit()
    return {"id": mid, "title": "Pending Mod", "author_id": test_user["id"], "status": "pending"}


@pytest_asyncio.fixture
async def test_paid_mod(db_session: AsyncSession, test_user: dict) -> dict:
    result = await db_session.execute(
        text("""
            INSERT INTO mods (title, description, category, project, price, subscription_price, file_url, author_id, status, download_count, average_rating, rating_count, is_pinned, created_at, updated_at)
            VALUES ('Paid Mod', 'A paid mod', 'clothes', 'gta5rp', 50.0, NULL, 'http://files.test/paid.zip', :uid, 'approved', 0, 0.0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
        """),
        {"uid": test_user["id"]},
    )
    mid = result.scalar()
    await db_session.commit()
    return {"id": mid, "title": "Paid Mod", "author_id": test_user["id"], "price": 50.0}


@pytest_asyncio.fixture
async def another_user(db_session: AsyncSession) -> dict:
    hashed = pwd_ctx.hash("OtherPass123")
    result = await db_session.execute(
        text("""
            INSERT INTO users (email, username, password_hash, role, balance, email_verified, created_at, updated_at)
            VALUES ('other@example.com', 'otheruser', :pw, 'user', 500, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
        """),
        {"pw": hashed},
    )
    uid = result.scalar()
    await db_session.commit()
    return {"id": uid, "email": "other@example.com", "username": "otheruser", "role": "user", "balance": 500}


@pytest_asyncio.fixture
async def another_user_headers(another_user: dict) -> dict:
    now = datetime.now(timezone.utc)
    access_token = jwt.encode(
        {
            "sub": str(another_user["id"]),
            "email": another_user["email"],
            "role": another_user["role"],
            "exp": now + timedelta(hours=1),
            "type": "access",
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return {"Authorization": f"Bearer {access_token}"}
