import pytest
from httpx import AsyncClient

API_PREFIX = "/api/v1/settings"


@pytest.mark.asyncio
async def test_get_settings_defaults(client: AsyncClient, auth_headers: dict):
    response = await client.get(f"{API_PREFIX}/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["theme"] == "dark"
    assert data["data"]["language"] == "en"
    assert data["data"]["email_notifications"] is True
    assert data["data"]["push_notifications"] is True
    assert data["data"]["two_factor_enabled"] is False


@pytest.mark.asyncio
async def test_get_settings_unauthorized(client: AsyncClient):
    response = await client.get(f"{API_PREFIX}/")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_settings_theme(client: AsyncClient, auth_headers: dict):
    response = await client.put(f"{API_PREFIX}/", headers=auth_headers, json={
        "theme": "light",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["theme"] == "light"


@pytest.mark.asyncio
async def test_update_settings_language(client: AsyncClient, auth_headers: dict):
    response = await client.put(f"{API_PREFIX}/", headers=auth_headers, json={
        "language": "ru",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["language"] == "ru"


@pytest.mark.asyncio
async def test_update_settings_email_notifications(client: AsyncClient, auth_headers: dict):
    response = await client.put(f"{API_PREFIX}/", headers=auth_headers, json={
        "email_notifications": False,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["email_notifications"] is False


@pytest.mark.asyncio
async def test_update_settings_push_notifications(client: AsyncClient, auth_headers: dict):
    response = await client.put(f"{API_PREFIX}/", headers=auth_headers, json={
        "push_notifications": False,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["push_notifications"] is False


@pytest.mark.asyncio
async def test_update_settings_two_factor(client: AsyncClient, auth_headers: dict):
    response = await client.put(f"{API_PREFIX}/", headers=auth_headers, json={
        "two_factor_enabled": True,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["two_factor_enabled"] is True


@pytest.mark.asyncio
async def test_update_settings_invalid_key(client: AsyncClient, auth_headers: dict):
    response = await client.put(f"{API_PREFIX}/", headers=auth_headers, json={
        "invalid_key": "value",
    })
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_update_settings_unauthorized(client: AsyncClient):
    response = await client.put(f"{API_PREFIX}/", json={
        "theme": "light",
    })
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_and_get_settings_consistency(client: AsyncClient, auth_headers: dict):
    await client.put(f"{API_PREFIX}/", headers=auth_headers, json={
        "theme": "light",
        "language": "de",
    })

    response = await client.get(f"{API_PREFIX}/", headers=auth_headers)
    data = response.json()
    assert data["data"]["theme"] == "light"
    assert data["data"]["language"] == "de"
