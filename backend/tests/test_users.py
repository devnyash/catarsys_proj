import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

API_PREFIX = "/api/v1/users"


@pytest.mark.asyncio
async def test_get_user_success(client: AsyncClient, test_user: dict):
    response = await client.get(f"{API_PREFIX}/{test_user['id']}")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["id"] == test_user["id"]
    assert data["data"]["username"] == "testuser"
    assert data["data"]["mod_count"] == 0
    assert data["data"]["favorite_count"] == 0


@pytest.mark.asyncio
async def test_get_user_not_found(client: AsyncClient):
    response = await client.get(f"{API_PREFIX}/99999")
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "USER_NOT_FOUND"


@pytest.mark.asyncio
async def test_get_user_mods_empty(client: AsyncClient, test_user: dict):
    response = await client.get(f"{API_PREFIX}/{test_user['id']}/mods")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["mods"] == []


@pytest.mark.asyncio
async def test_get_user_mods_with_mods(client: AsyncClient, test_user: dict, test_mod: dict, db_session: AsyncSession):
    await db_session.execute(
        text("""
            INSERT INTO mods (title, description, category, project, price, author_id, status, download_count, average_rating, rating_count, is_pinned, created_at, updated_at)
            VALUES ('Another Mod', 'Another mod description', 'effects', 'gta5rp', 10.0, :uid, 'approved', 5, 4.5, 10, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
        """),
        {"uid": test_user["id"]},
    )
    await db_session.commit()

    response = await client.get(f"{API_PREFIX}/{test_user['id']}/mods")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]["mods"]) >= 1
    mod_titles = [m["title"] for m in data["data"]["mods"]]
    assert "Another Mod" in mod_titles


@pytest.mark.asyncio
async def test_get_user_mods_user_not_found(client: AsyncClient):
    response = await client.get(f"{API_PREFIX}/99999/mods")
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "USER_NOT_FOUND"
