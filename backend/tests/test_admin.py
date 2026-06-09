import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

API_PREFIX = "/api/v1/admin"


@pytest.mark.asyncio
async def test_list_users_as_admin(client: AsyncClient, admin_headers: dict, test_user: dict):
    response = await client.get(f"{API_PREFIX}/users", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]["users"]) >= 1
    emails = [u["email"] for u in data["data"]["users"]]
    assert "test@example.com" in emails


@pytest.mark.asyncio
async def test_list_users_as_non_admin(client: AsyncClient, auth_headers: dict):
    response = await client.get(f"{API_PREFIX}/users", headers=auth_headers)
    assert response.status_code == 403
    data = response.json()
    assert "detail" in data


@pytest.mark.asyncio
async def test_list_users_unauthorized(client: AsyncClient):
    response = await client.get(f"{API_PREFIX}/users")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_ban_user_as_admin(client: AsyncClient, admin_headers: dict, test_user: dict):
    response = await client.put(f"{API_PREFIX}/users/{test_user['id']}/ban", headers=admin_headers, json={
        "ban": True,
        "reason": "Violating terms",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "banned" in data["data"]["message"]


@pytest.mark.asyncio
async def test_unban_user_as_admin(client: AsyncClient, admin_headers: dict, test_user: dict, db_session: AsyncSession):
    await db_session.execute(
        text("UPDATE users SET is_banned = 1 WHERE id = :uid"),
        {"uid": test_user["id"]},
    )
    await db_session.commit()

    response = await client.put(f"{API_PREFIX}/users/{test_user['id']}/ban", headers=admin_headers, json={
        "ban": False,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "unbanned" in data["data"]["message"]


@pytest.mark.asyncio
async def test_ban_user_not_found(client: AsyncClient, admin_headers: dict):
    response = await client.put(f"{API_PREFIX}/users/99999/ban", headers=admin_headers, json={
        "ban": True,
    })
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_ban_admin_user_fails(client: AsyncClient, admin_headers: dict, db_session: AsyncSession):
    result = await db_session.execute(
        text("""
            INSERT INTO users (email, username, password_hash, role, balance, email_verified, created_at, updated_at)
            VALUES ('otheradmin@example.com', 'otheradmin', 'hash', 'admin', 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
        """),
    )
    other_admin_id = result.scalar()
    await db_session.commit()

    response = await client.put(f"{API_PREFIX}/users/{other_admin_id}/ban", headers=admin_headers, json={
        "ban": True,
    })
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_change_role_as_admin(client: AsyncClient, admin_headers: dict, test_user: dict):
    response = await client.put(f"{API_PREFIX}/users/{test_user['id']}/role", headers=admin_headers, json={
        "role": "moderator",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["message"] == "User role changed to moderator"


@pytest.mark.asyncio
async def test_change_role_invalid_role(client: AsyncClient, admin_headers: dict, test_user: dict):
    response = await client.put(f"{API_PREFIX}/users/{test_user['id']}/role", headers=admin_headers, json={
        "role": "superadmin",
    })
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "INVALID_ROLE"


@pytest.mark.asyncio
async def test_change_role_user_not_found(client: AsyncClient, admin_headers: dict):
    response = await client.put(f"{API_PREFIX}/users/99999/role", headers=admin_headers, json={
        "role": "moderator",
    })
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_moderation_queue_empty(client: AsyncClient, admin_headers: dict):
    response = await client.get(f"{API_PREFIX}/mods/pending", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["mods"] == []


@pytest.mark.asyncio
async def test_get_moderation_queue_with_pending(client: AsyncClient, admin_headers: dict, test_pending_mod: dict):
    response = await client.get(f"{API_PREFIX}/mods/pending", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]["mods"]) >= 1
    assert data["data"]["mods"][0]["title"] == "Pending Mod"


@pytest.mark.asyncio
async def test_get_moderation_queue_unauthorized(client: AsyncClient):
    response = await client.get(f"{API_PREFIX}/mods/pending")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_approve_mod_as_admin(client: AsyncClient, admin_headers: dict, test_pending_mod: dict):
    response = await client.post(f"{API_PREFIX}/mods/{test_pending_mod['id']}/approve", headers=admin_headers, json={
        "pin": False,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["message"] == "Mod approved"


@pytest.mark.asyncio
async def test_approve_non_existent_mod(client: AsyncClient, admin_headers: dict):
    response = await client.post(f"{API_PREFIX}/mods/99999/approve", headers=admin_headers, json={
        "pin": False,
    })
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "MOD_NOT_FOUND"


@pytest.mark.asyncio
async def test_approve_mod_unauthorized(client: AsyncClient, test_pending_mod: dict):
    response = await client.post(f"{API_PREFIX}/mods/{test_pending_mod['id']}/approve", json={
        "pin": False,
    })
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_reject_mod_as_admin(client: AsyncClient, admin_headers: dict, test_pending_mod: dict, db_session: AsyncSession):
    response = await client.post(f"{API_PREFIX}/mods/{test_pending_mod['id']}/reject", headers=admin_headers, json={
        "reason": "This mod violates our content policy guidelines",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


@pytest.mark.asyncio
async def test_reject_mod_short_reason(client: AsyncClient, admin_headers: dict, test_pending_mod: dict):
    response = await client.post(f"{API_PREFIX}/mods/{test_pending_mod['id']}/reject", headers=admin_headers, json={
        "reason": "Short",
    })
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_set_balance_as_admin(client: AsyncClient, admin_headers: dict, test_user: dict):
    response = await client.put(f"{API_PREFIX}/users/{test_user['id']}/balance", headers=admin_headers, json={
        "balance": 500.0,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


@pytest.mark.asyncio
async def test_set_balance_negative(client: AsyncClient, admin_headers: dict, test_user: dict):
    response = await client.put(f"{API_PREFIX}/users/{test_user['id']}/balance", headers=admin_headers, json={
        "balance": -100.0,
    })
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_get_platform_stats(client: AsyncClient, admin_headers: dict):
    response = await client.get(f"{API_PREFIX}/stats", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "total_users" in data["data"]
    assert "total_mods" in data["data"]
