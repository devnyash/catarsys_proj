from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    DATABASE_URL: str = "mysql+aiomysql://catarsys:password@localhost:3306/catarsys"
    REDIS_URL: str = "redis://localhost:6379/0"

    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    SMTP_HOST: str = "smtp.example.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "noreply@catarsys.app"
    SMTP_PASSWORD: str = "your-smtp-password"

    TELEGRAM_BOT_TOKEN: str = "your-bot-token"

    APP_ENV: str = "development"

    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    API_V1_PREFIX: str = "/api/v1"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
