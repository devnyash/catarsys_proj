import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

API_PREFIX = "/api/v1/mods"


@pytest.mark.asyncio
async def test_list_mods_success(client: AsyncClient, test_mod: dict):
    response = await client.get(f"{API_PREFIX}/")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]["mods"]) >= 1
    assert data["data"]["mods"][0]["title"] == "Test Mod"


@pytest.mark.asyncio
async def test_list_mods_pagination(client: AsyncClient, test_mod: dict):
    response = await client.get(f"{API_PREFIX}/?limit=1")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]["mods"]) == 1
    assert data["data"]["has_more"] is False


@pytest.mark.asyncio
async def test_list_mods_empty(client: AsyncClient):
    response = await client.get(f"{API_PREFIX}/")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["mods"] == []


@pytest.mark.asyncio
async def test_list_mods_filter_category(client: AsyncClient, db_session: AsyncSession, test_user: dict):
    await db_session.execute(
        text("""
            INSERT INTO mods (title, description, category, project, price, author_id, status, download_count, average_rating, rating_count, is_pinned, created_at, updated_at)
            VALUES ('Cosmetic Mod', 'A cosmetic mod', 'clothes', 'gta5rp', 0.0, :uid, 'approved', 0, 0.0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """),
        {"uid": test_user["id"]},
    )
    await db_session.commit()

    response = await client.get(f"{API_PREFIX}/?category=clothes")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]["mods"]) == 1
    assert data["data"]["mods"][0]["category"] == "clothes"


@pytest.mark.asyncio
async def test_list_mods_filter_project(client: AsyncClient, test_mod: dict):
    response = await client.get(f"{API_PREFIX}/?project=gta5rp")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]["mods"]) >= 1


@pytest.mark.asyncio
async def test_search_mods_success(client: AsyncClient, test_mod: dict):
    response = await client.get(f"{API_PREFIX}/search?q=Test")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]["mods"]) >= 1


@pytest.mark.asyncio
async def test_search_mods_no_results(client: AsyncClient):
    response = await client.get(f"{API_PREFIX}/search?q=xyznonexistent12345")
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["mods"] == []


@pytest.mark.asyncio
async def test_search_mods_empty_result(client: AsyncClient):
    response = await client.get(f"{API_PREFIX}/search?q=a")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["mods"] == []


@pytest.mark.asyncio
async def test_get_mod_success(client: AsyncClient, test_mod: dict):
    response = await client.get(f"{API_PREFIX}/{test_mod['id']}")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["id"] == test_mod["id"]
    assert data["data"]["title"] == "Test Mod"
    assert "images" in data["data"]


@pytest.mark.asyncio
async def test_get_mod_not_found(client: AsyncClient):
    response = await client.get(f"{API_PREFIX}/99999")
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "MOD_NOT_FOUND"


@pytest.mark.asyncio
async def test_create_mod_success(client: AsyncClient, auth_headers: dict):
    response = await client.post(f"{API_PREFIX}/", headers=auth_headers, json={
        "title": "New Mod",
        "description": "A brand new mod",
        "category": "redux",
        "project": "gta5rp",
        "price": 0.0,
    })
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["message"] == "Mod created and pending moderation"
    assert "id" in data["data"]


@pytest.mark.asyncio
async def test_create_mod_negative_price(client: AsyncClient, auth_headers: dict):
    response = await client.post(f"{API_PREFIX}/", headers=auth_headers, json={
        "title": "Negative Price Mod",
        "description": "A mod with negative price",
        "category": "redux",
        "project": "gta5rp",
        "price": -10.0,
    })
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_create_mod_missing_fields(client: AsyncClient, auth_headers: dict):
    response = await client.post(f"{API_PREFIX}/", headers=auth_headers, json={})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_mod_no_auth(client: AsyncClient):
    response = await client.post(f"{API_PREFIX}/", json={
        "title": "Unauthorized Mod",
        "description": "No auth",
        "category": "redux",
        "project": "gta5rp",
    })
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_mod_as_author(client: AsyncClient, auth_headers: dict, test_mod: dict):
    response = await client.put(f"{API_PREFIX}/{test_mod['id']}", headers=auth_headers, json={
        "title": "Updated Mod Title",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["message"] == "Mod updated"


@pytest.mark.asyncio
async def test_update_mod_as_non_author(client: AsyncClient, another_user_headers: dict, test_mod: dict):
    response = await client.put(f"{API_PREFIX}/{test_mod['id']}", headers=another_user_headers, json={
        "title": "Hacked Title",
    })
    assert response.status_code == 403
    data = response.json()
    assert data["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_update_mod_not_found(client: AsyncClient, auth_headers: dict):
    response = await client.put(f"{API_PREFIX}/99999", headers=auth_headers, json={
        "title": "Ghost Mod",
    })
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_mod_as_author(client: AsyncClient, auth_headers: dict, test_mod: dict):
    response = await client.delete(f"{API_PREFIX}/{test_mod['id']}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["message"] == "Mod deleted"

    get_resp = await client.get(f"{API_PREFIX}/{test_mod['id']}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_mod_as_non_author(client: AsyncClient, another_user_headers: dict, test_mod: dict):
    response = await client.delete(f"{API_PREFIX}/{test_mod['id']}", headers=another_user_headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_delete_mod_not_found(client: AsyncClient, auth_headers: dict):
    response = await client.delete(f"{API_PREFIX}/99999", headers=auth_headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_request_download_free_mod(client: AsyncClient, auth_headers: dict, test_mod: dict):
    response = await client.post(f"{API_PREFIX}/{test_mod['id']}/request-download", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "download_url" in data["data"]


@pytest.mark.asyncio
async def test_request_download_paid_not_purchased(client: AsyncClient, another_user_headers: dict, test_paid_mod: dict, test_mod: dict):
    response = await client.post(f"{API_PREFIX}/{test_paid_mod['id']}/request-download", headers=another_user_headers)
    assert response.status_code == 402
    data = response.json()
    assert data["error"]["code"] in ("NOT_PURCHASED", "SUBSCRIPTION_REQUIRED")


@pytest.mark.asyncio
async def test_request_download_paid_purchased(client: AsyncClient, another_user_headers: dict, another_user: dict, test_paid_mod: dict, db_session: AsyncSession):
    await db_session.execute(
        text("INSERT INTO purchases (user_id, mod_id, amount, created_at) VALUES (:uid, :mid, :amount, CURRENT_TIMESTAMP)"),
        {"uid": another_user["id"], "mid": test_paid_mod["id"], "amount": test_paid_mod["price"]},
    )
    await db_session.commit()

    response = await client.post(f"{API_PREFIX}/{test_paid_mod['id']}/request-download", headers=another_user_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "download_url" in data["data"]


@pytest.mark.asyncio
async def test_request_download_not_approved(client: AsyncClient, auth_headers: dict, test_pending_mod: dict):
    response = await client.post(f"{API_PREFIX}/{test_pending_mod['id']}/request-download", headers=auth_headers)
    assert response.status_code == 403
    data = response.json()
    assert data["error"]["code"] == "MOD_NOT_AVAILABLE"


@pytest.mark.asyncio
async def test_request_download_own_mod(client: AsyncClient, auth_headers: dict, test_mod: dict):
    response = await client.post(f"{API_PREFIX}/{test_mod['id']}/request-download", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


@pytest.mark.asyncio
async def test_rate_mod_success(client: AsyncClient, another_user_headers: dict, another_user: dict, test_mod: dict, db_session: AsyncSession):
    await db_session.execute(
        text("INSERT INTO downloads (user_id, mod_id, created_at) VALUES (:uid, :mid, CURRENT_TIMESTAMP)"),
        {"uid": another_user["id"], "mid": test_mod["id"]},
    )
    await db_session.commit()

    response = await client.post(f"{API_PREFIX}/{test_mod['id']}/rate", headers=another_user_headers, json={
        "rating": 5,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["rating_count"] == 1
    assert data["data"]["average_rating"] == 5.0


@pytest.mark.asyncio
async def test_rate_mod_duplicate_update(client: AsyncClient, another_user_headers: dict, another_user: dict, test_mod: dict, db_session: AsyncSession):
    await db_session.execute(
        text("INSERT INTO downloads (user_id, mod_id, created_at) VALUES (:uid, :mid, CURRENT_TIMESTAMP)"),
        {"uid": another_user["id"], "mid": test_mod["id"]},
    )
    await db_session.execute(
        text("INSERT INTO mod_ratings (user_id, mod_id, rating, created_at) VALUES (:uid, :mid, 3, CURRENT_TIMESTAMP)"),
        {"uid": another_user["id"], "mid": test_mod["id"]},
    )
    await db_session.execute(
        text("UPDATE mods SET rating_count = 1, average_rating = 3.0 WHERE id = :mid"),
        {"mid": test_mod["id"]},
    )
    await db_session.commit()

    response = await client.post(f"{API_PREFIX}/{test_mod['id']}/rate", headers=another_user_headers, json={
        "rating": 4,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["average_rating"] == 4.0


@pytest.mark.asyncio
async def test_rate_mod_not_downloaded(client: AsyncClient, another_user_headers: dict, test_mod: dict):
    response = await client.post(f"{API_PREFIX}/{test_mod['id']}/rate", headers=another_user_headers, json={
        "rating": 5,
    })
    assert response.status_code == 403
    data = response.json()
    assert data["error"]["code"] == "NOT_PURCHASED"


@pytest.mark.asyncio
async def test_rate_mod_own_mod(client: AsyncClient, auth_headers: dict, test_mod: dict):
    response = await client.post(f"{API_PREFIX}/{test_mod['id']}/rate", headers=auth_headers, json={
        "rating": 5,
    })
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "CANNOT_RATE_OWN"


@pytest.mark.asyncio
async def test_rate_mod_invalid_rating(client: AsyncClient, another_user_headers: dict, another_user: dict, test_mod: dict, db_session: AsyncSession):
    await db_session.execute(
        text("INSERT INTO downloads (user_id, mod_id, created_at) VALUES (:uid, :mid, CURRENT_TIMESTAMP)"),
        {"uid": another_user["id"], "mid": test_mod["id"]},
    )
    await db_session.commit()

    response = await client.post(f"{API_PREFIX}/{test_mod['id']}/rate", headers=another_user_headers, json={
        "rating": 6,
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_favorite_toggle_on(client: AsyncClient, auth_headers: dict, test_mod: dict):
    response = await client.post(f"{API_PREFIX}/{test_mod['id']}/favorite", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["favorited"] is True


@pytest.mark.asyncio
async def test_favorite_toggle_off(client: AsyncClient, auth_headers: dict, test_mod: dict):
    await client.post(f"{API_PREFIX}/{test_mod['id']}/favorite", headers=auth_headers)

    response = await client.post(f"{API_PREFIX}/{test_mod['id']}/favorite", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["favorited"] is False


@pytest.mark.asyncio
async def test_favorite_mod_not_found(client: AsyncClient, auth_headers: dict):
    response = await client.post(f"{API_PREFIX}/99999/favorite", headers=auth_headers)
    assert response.status_code == 404
