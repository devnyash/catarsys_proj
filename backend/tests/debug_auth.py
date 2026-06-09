"""Debug script for auth/me route"""
import asyncio
import os
import sqlite3
import tempfile
import sys
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
os.environ["ENVIRONMENT"] = "development"

import jwt
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from passlib.context import CryptContext

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user

import app.api.v1.auth as auth_module
auth_module.SECRET_KEY = settings.SECRET_KEY
auth_module.ALGORITHM = settings.ALGORITHM

from app.api.v1 import auth

_db_file = os.path.join(tempfile.gettempdir(), "test_debug_auth.db")
if os.path.exists(_db_file):
    os.unlink(_db_file)

TEST_DB_URL = f"sqlite+aiosqlite:///{_db_file}"
test_engine = create_async_engine(
    TEST_DB_URL, poolclass=NullPool, echo=False,
    connect_args={"detect_types": sqlite3.PARSE_DECLTYPES},
)

sqlite3.register_converter("timestamp", lambda x: datetime.strptime(x.decode() if isinstance(x, bytes) else x, "%Y-%m-%d %H:%M:%S"))
sqlite3.register_converter("TIMESTAMP", lambda x: datetime.strptime(x.decode() if isinstance(x, bytes) else x, "%Y-%m-%d %H:%M:%S"))

test_async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

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
"""

test_app = FastAPI()
test_app.include_router(auth.router, prefix=settings.API_V1_PREFIX)

for r in test_app.routes:
    if hasattr(r, "methods") and hasattr(r, "path"):
        print(f"  {r.methods} {r.path}")


async def override_get_db():
    async with test_async_session() as session:
        yield session
        await session.commit()


async def override_get_current_user():
    return 1


test_app.dependency_overrides[get_db] = override_get_db
test_app.dependency_overrides[get_current_user] = override_get_current_user


async def main():
    async with test_engine.begin() as conn:
        await conn.execute(text(CREATE_TABLES_SQL))

    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hashed = pwd_ctx.hash("TestPass123")

    async with test_async_session() as s:
        result = await s.execute(
            text("""INSERT INTO users (email, username, password_hash, role, balance, email_verified, created_at, updated_at) 
                    VALUES (:e, :u, :pw, :r, 1000, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id"""),
            {"e": "test@example.com", "u": "testuser", "pw": hashed, "r": "user"},
        )
        uid = result.scalar()
        await s.commit()
        print(f"Created user ID: {uid}")

    now = datetime.now(timezone.utc)
    access_token = jwt.encode(
        {"sub": str(uid), "email": "test@example.com", "role": "user", "exp": now + timedelta(hours=1), "type": "access"},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    headers = {"Authorization": f"Bearer {access_token}"}

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/v1/auth/me", headers=headers)
        print(f"Status: {resp.status_code}")
        print(f"Body: {resp.text[:500]}")


if __name__ == "__main__":
    asyncio.run(main())
    os.unlink(_db_file)
