from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import auth, mods, users, payments, media, settings as settings_router, updates, admin, ws, notifications


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="Catarsys API",
    version="1.3.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["Auth"])
app.include_router(mods.router, prefix=f"{settings.API_V1_PREFIX}/mods", tags=["Mods"])
app.include_router(users.router, prefix=f"{settings.API_V1_PREFIX}/users", tags=["Users"])
app.include_router(payments.router, prefix=f"{settings.API_V1_PREFIX}/payments", tags=["Payments"])
app.include_router(media.router, prefix=f"{settings.API_V1_PREFIX}/media", tags=["Media"])
app.include_router(settings_router.router, prefix=f"{settings.API_V1_PREFIX}/settings", tags=["Settings"])
app.include_router(updates.router, prefix=f"{settings.API_V1_PREFIX}/app/updates", tags=["Updates"])
app.include_router(admin.router, prefix=f"{settings.API_V1_PREFIX}/admin", tags=["Admin"])
app.include_router(ws.router, prefix=f"{settings.API_V1_PREFIX}", tags=["WebSocket"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_PREFIX}", tags=["Notifications"])


@app.get("/")
async def root():
    return {"success": True, "data": {"name": "Catarsys API", "version": "1.3.0"}}


@app.get("/health")
async def health():
    return {"status": "ok"}
