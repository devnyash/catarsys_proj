import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

API_PREFIX = "/api/v1/payments"


@pytest.mark.asyncio
async def test_deposit_success(client: AsyncClient, auth_headers: dict):
    response = await client.post(f"{API_PREFIX}/deposit", headers=auth_headers, json={
        "amount": 100.0,
        "payment_method": "card",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["amount"] == 100.0
    assert "transaction_id" in data["data"]
    assert "payment_url" in data["data"]
    assert "qr_code" in data["data"]


@pytest.mark.asyncio
async def test_deposit_invalid_amount_below_minimum(client: AsyncClient, auth_headers: dict):
    response = await client.post(f"{API_PREFIX}/deposit", headers=auth_headers, json={
        "amount": 5.0,
        "payment_method": "card",
    })
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "MINIMUM_AMOUNT"


@pytest.mark.asyncio
async def test_deposit_invalid_amount_above_maximum(client: AsyncClient, auth_headers: dict):
    response = await client.post(f"{API_PREFIX}/deposit", headers=auth_headers, json={
        "amount": 200000.0,
        "payment_method": "card",
    })
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "MAXIMUM_AMOUNT"


@pytest.mark.asyncio
async def test_deposit_no_auth(client: AsyncClient):
    response = await client.post(f"{API_PREFIX}/deposit", json={
        "amount": 100.0,
        "payment_method": "card",
    })
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_transactions_success(client: AsyncClient, auth_headers: dict, db_session: AsyncSession, test_user: dict):
    await db_session.execute(
        text("""
            INSERT INTO transactions (user_id, type, amount, status, payment_method, description, created_at)
            VALUES (:uid, 'deposit', 50.0, 'completed', 'card', 'Test deposit', CURRENT_TIMESTAMP)
        """),
        {"uid": test_user["id"]},
    )
    await db_session.commit()

    response = await client.get(f"{API_PREFIX}/transactions", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]["transactions"]) >= 1
    assert data["data"]["transactions"][0]["type"] == "deposit"
    assert float(data["data"]["transactions"][0]["amount"]) == 50.0


@pytest.mark.asyncio
async def test_get_transactions_empty(client: AsyncClient, auth_headers: dict):
    response = await client.get(f"{API_PREFIX}/transactions", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["transactions"] == []


@pytest.mark.asyncio
async def test_get_transactions_unauthorized(client: AsyncClient):
    response = await client.get(f"{API_PREFIX}/transactions")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_cart_checkout_success(client: AsyncClient, auth_headers: dict, test_user: dict, test_mod: dict, another_user: dict, db_session: AsyncSession):
    await db_session.execute(
        text("UPDATE users SET balance = 1000 WHERE id = :uid"),
        {"uid": test_user["id"]},
    )
    await db_session.commit()

    mod2_result = await db_session.execute(
        text("""
            INSERT INTO mods (title, description, category, project, price, author_id, status, download_count, average_rating, rating_count, is_pinned, created_at, updated_at)
            VALUES ('Another Mod', 'Desc', 'redux', 'gta5rp', 25.0, :uid, 'approved', 0, 0.0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
        """),
        {"uid": another_user["id"]},
    )
    mod2_id = mod2_result.scalar()
    await db_session.commit()

    response = await client.post(f"{API_PREFIX}/cart/checkout", headers=auth_headers, json={
        "items": [{"mod_id": mod2_id, "type": "purchase"}],
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["items_purchased"] == 1
    assert float(data["data"]["total"]) == 25.0


@pytest.mark.asyncio
async def test_cart_checkout_insufficient_balance(client: AsyncClient, auth_headers: dict, test_user: dict, another_user: dict, db_session: AsyncSession):
    await db_session.execute(
        text("UPDATE users SET balance = 5 WHERE id = :uid"),
        {"uid": test_user["id"]},
    )
    await db_session.commit()

    mod_result = await db_session.execute(
        text("""
            INSERT INTO mods (title, description, category, project, price, author_id, status, download_count, average_rating, rating_count, is_pinned, created_at, updated_at)
            VALUES ('Expensive Mod', 'Very expensive', 'redux', 'gta5rp', 100.0, :uid, 'approved', 0, 0.0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
        """),
        {"uid": another_user["id"]},
    )
    mod_id = mod_result.scalar()
    await db_session.commit()

    response = await client.post(f"{API_PREFIX}/cart/checkout", headers=auth_headers, json={
        "items": [{"mod_id": mod_id, "type": "purchase"}],
    })
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "INSUFFICIENT_BALANCE"


@pytest.mark.asyncio
async def test_cart_checkout_already_purchased(client: AsyncClient, auth_headers: dict, test_user: dict, another_user: dict, test_mod: dict, db_session: AsyncSession):
    await db_session.execute(
        text("UPDATE users SET balance = 1000 WHERE id = :uid"),
        {"uid": test_user["id"]},
    )
    await db_session.execute(
        text("INSERT INTO purchases (user_id, mod_id, amount, created_at) VALUES (:uid, :mid, 0, CURRENT_TIMESTAMP)"),
        {"uid": another_user["id"], "mid": test_mod["id"]},
    )
    await db_session.commit()

    response = await client.post(f"{API_PREFIX}/cart/checkout", headers=auth_headers, json={
        "items": [{"mod_id": test_mod["id"], "type": "purchase"}],
    })
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "OWN_MOD"


@pytest.mark.asyncio
async def test_cart_checkout_empty_cart(client: AsyncClient, auth_headers: dict):
    response = await client.post(f"{API_PREFIX}/cart/checkout", headers=auth_headers, json={
        "items": [],
    })
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "EMPTY_CART"


@pytest.mark.asyncio
async def test_webhook_success(client: AsyncClient, db_session: AsyncSession, test_user: dict):
    result = await db_session.execute(
        text("""
            INSERT INTO transactions (user_id, type, amount, status, payment_method, payment_id, description, created_at)
            VALUES (:uid, 'deposit', 100.0, 'pending', 'card', 'test_pid_123', 'Deposit', CURRENT_TIMESTAMP)
            RETURNING id
        """),
        {"uid": test_user["id"]},
    )
    await db_session.commit()

    response = await client.post(f"{API_PREFIX}/webhook", json={
        "payment_id": "test_pid_123",
        "status": "success",
        "amount": 100.0,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


@pytest.mark.asyncio
async def test_withdraw_success(client: AsyncClient, auth_headers: dict, test_user: dict, db_session: AsyncSession):
    await db_session.execute(
        text("UPDATE users SET balance = 500 WHERE id = :uid"),
        {"uid": test_user["id"]},
    )
    await db_session.commit()

    response = await client.post(f"{API_PREFIX}/withdraw", headers=auth_headers, json={
        "amount": 200.0,
        "method": "card",
        "address": "some_bank_account_12345",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "pending"


@pytest.mark.asyncio
async def test_withdraw_insufficient_balance(client: AsyncClient, auth_headers: dict):
    response = await client.post(f"{API_PREFIX}/withdraw", headers=auth_headers, json={
        "amount": 100000.0,
        "method": "card",
        "address": "some_bank_account_12345",
    })
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "INSUFFICIENT_BALANCE"
