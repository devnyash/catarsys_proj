import io
import os
import tempfile

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

API_PREFIX = "/api/v1/media"


@pytest.mark.asyncio
async def test_get_avatar_no_avatar(client: AsyncClient, test_user: dict):
    response = await client.get(f"{API_PREFIX}/avatar/{test_user['id']}")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/svg+xml"


@pytest.mark.asyncio
async def test_get_avatar_user_not_found(client: AsyncClient):
    response = await client.get(f"{API_PREFIX}/avatar/99999")
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "USER_NOT_FOUND"


@pytest.mark.asyncio
async def test_get_avatar_with_avatar(client: AsyncClient, test_user: dict, db_session: AsyncSession):
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        f.write(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
        avatar_path = f.name

    await db_session.execute(
        text("UPDATE users SET avatar_url = :path WHERE id = :uid"),
        {"path": avatar_path, "uid": test_user["id"]},
    )
    await db_session.commit()

    response = await client.get(f"{API_PREFIX}/avatar/{test_user['id']}")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"

    os.unlink(avatar_path)


@pytest.mark.asyncio
async def test_get_avatar_stale_path(client: AsyncClient, test_user: dict, db_session: AsyncSession):
    await db_session.execute(
        text("UPDATE users SET avatar_url = :path WHERE id = :uid"),
        {"path": "C:\\nonexistent\\avatar.png", "uid": test_user["id"]},
    )
    await db_session.commit()

    response = await client.get(f"{API_PREFIX}/avatar/{test_user['id']}")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/svg+xml"


@pytest.mark.asyncio
async def test_upload_avatar_success(client: AsyncClient, auth_headers: dict):
    png_data = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    files = {"file": ("avatar.png", io.BytesIO(png_data), "image/png")}
    response = await client.post(f"{API_PREFIX}/upload?purpose=avatar", headers=auth_headers, files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "url" in data["data"]
    assert "path" in data["data"]


@pytest.mark.asyncio
async def test_upload_file_too_large(client: AsyncClient, auth_headers: dict):
    large_data = b"\x89PNG\r\n\x1a\n" + b"\x00" * (11 * 1024 * 1024)
    files = {"file": ("large.png", io.BytesIO(large_data), "image/png")}
    response = await client.post(f"{API_PREFIX}/upload?purpose=avatar", headers=auth_headers, files=files)
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "FILE_TOO_LARGE"


@pytest.mark.asyncio
async def test_upload_invalid_format(client: AsyncClient, auth_headers: dict):
    invalid_data = b"this is not an image file content"
    files = {"file": ("test.txt", io.BytesIO(invalid_data), "text/plain")}
    response = await client.post(f"{API_PREFIX}/upload?purpose=avatar", headers=auth_headers, files=files)
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "INVALID_FORMAT"


@pytest.mark.asyncio
async def test_upload_invalid_purpose(client: AsyncClient, auth_headers: dict):
    png_data = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    files = {"file": ("test.png", io.BytesIO(png_data), "image/png")}
    response = await client.post(f"{API_PREFIX}/upload?purpose=invalid", headers=auth_headers, files=files)
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "INVALID_PURPOSE"


@pytest.mark.asyncio
async def test_upload_no_auth(client: AsyncClient):
    png_data = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    files = {"file": ("test.png", io.BytesIO(png_data), "image/png")}
    response = await client.post(f"{API_PREFIX}/upload?purpose=avatar", files=files)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_mod_cover_not_found(client: AsyncClient, test_mod: dict):
    response = await client.get(f"{API_PREFIX}/mod/{test_mod['id']}/cover")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_mod_cover_mod_not_found(client: AsyncClient):
    response = await client.get(f"{API_PREFIX}/mod/99999/cover")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_gallery_image_not_found(client: AsyncClient, test_mod: dict):
    response = await client.get(f"{API_PREFIX}/mod/{test_mod['id']}/gallery/999")
    assert response.status_code == 404
