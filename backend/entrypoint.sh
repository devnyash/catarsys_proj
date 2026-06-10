#!/bin/bash
set -e

python -c "
import asyncio
import app.models  # noqa: F401 - register all models with Base.metadata
from app.core.database import engine, Base

async def init():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()

asyncio.run(init())
"

exec uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 4
