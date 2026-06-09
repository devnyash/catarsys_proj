from pydantic import BaseModel, Field


class SettingsResponse(BaseModel):
    theme: str = "dark"
    ui_scale: int = 100
    auto_update: bool = True
    notify_app: bool = True
    notify_telegram: bool = False
    download_path: str | None = None

    model_config = {"from_attributes": True}


class SettingsUpdateRequest(BaseModel):
    theme: str | None = Field(None, pattern=r"^(light|dark|system)$")
    ui_scale: int | None = Field(None, ge=50, le=200)
    auto_update: bool | None = None
    notify_app: bool | None = None
    notify_telegram: bool | None = None
    download_path: str | None = Field(None, max_length=512)
