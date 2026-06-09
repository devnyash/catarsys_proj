from pydantic import BaseModel, Field


class MediaResponse(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    mime_type: str
    file_size: int
    url: str | None = None

    model_config = {"from_attributes": True}
