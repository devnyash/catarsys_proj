import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

API_PREFIX = "/api/v1/auth"


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient, db_session: AsyncSession):
    response = await client.post(f"{API_PREFIX}/register", json={
        "email": "newuser@example.com",
        "username": "newuser",
        "password": "StrongPass1",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert "Registration successful" in data["data"]["message"]

    row = await db_session.execute(
        text("SELECT id FROM users WHERE email = :e"), {"e": "newuser@example.com"}
    )
    assert row.scalar() is not None


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, test_user: dict):
    response = await client.post(f"{API_PREFIX}/register", json={
        "email": "test@example.com",
        "username": "another",
        "password": "StrongPass1",
    })
    assert response.status_code == 409
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "EMAIL_OR_USERNAME_EXISTS"


@pytest.mark.asyncio
async def test_register_duplicate_username(client: AsyncClient, test_user: dict):
    response = await client.post(f"{API_PREFIX}/register", json={
        "email": "another@example.com",
        "username": "testuser",
        "password": "StrongPass1",
    })
    assert response.status_code == 409
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "EMAIL_OR_USERNAME_EXISTS"


@pytest.mark.asyncio
async def test_register_weak_password_no_upper(client: AsyncClient):
    response = await client.post(f"{API_PREFIX}/register", json={
        "email": "weak@example.com",
        "username": "weakuser",
        "password": "onlylower1",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_weak_password_no_digit(client: AsyncClient):
    response = await client.post(f"{API_PREFIX}/register", json={
        "email": "weak2@example.com",
        "username": "weakuser2",
        "password": "OnlyLetters",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_weak_password_too_short(client: AsyncClient):
    response = await client.post(f"{API_PREFIX}/register", json={
        "email": "weak3@example.com",
        "username": "weakuser3",
        "password": "Short1",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_verify_email_success(client: AsyncClient, db_session: AsyncSession):
    hashed = "$2b$12$LJ3m4ys3Lk0TSwHn.iqkBuWY7M7Y7M7Y7M7Y7M7Y7M7Y7M7Y7M7O"
    result = await db_session.execute(
        text("""
            INSERT INTO users (email, username, password_hash, role, balance, email_verified, created_at, updated_at)
            VALUES ('verify@example.com', 'verifyuser', :pw, 'user', 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
        """),
        {"pw": hashed},
    )
    uid = result.scalar()
    await db_session.execute(
        text("""
            INSERT INTO email_verifications (user_id, code, expires_at, created_at)
            VALUES (:uid, '123456', datetime('now', '+1 hour'), CURRENT_TIMESTAMP)
        """),
        {"uid": uid},
    )
    await db_session.commit()

    response = await client.post(f"{API_PREFIX}/verify-email", json={
        "email": "verify@example.com",
        "code": "123456",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["message"] == "Email verified successfully"


@pytest.mark.asyncio
async def test_verify_email_wrong_code(client: AsyncClient, db_session: AsyncSession):
    hashed = "$2b$12$LJ3m4ys3Lk0TSwHn.iqkBuWY7M7Y7M7Y7M7Y7M7Y7M7Y7M7Y7M7O"
    result = await db_session.execute(
        text("""
            INSERT INTO users (email, username, password_hash, role, balance, email_verified, created_at, updated_at)
            VALUES ('wrongcode@example.com', 'wrongcodeuser', :pw, 'user', 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
        """),
        {"pw": hashed},
    )
    uid = result.scalar()
    await db_session.execute(
        text("""
            INSERT INTO email_verifications (user_id, code, expires_at, created_at)
            VALUES (:uid, '123456', datetime('now', '+1 hour'), CURRENT_TIMESTAMP)
        """),
        {"uid": uid},
    )
    await db_session.commit()

    response = await client.post(f"{API_PREFIX}/verify-email", json={
        "email": "wrongcode@example.com",
        "code": "000000",
    })
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "INVALID_CODE"


@pytest.mark.asyncio
async def test_verify_email_expired_code(client: AsyncClient, db_session: AsyncSession):
    hashed = "$2b$12$LJ3m4ys3Lk0TSwHn.iqkBuWY7M7Y7M7Y7M7Y7M7Y7M7Y7M7Y7M7O"
    result = await db_session.execute(
        text("""
            INSERT INTO users (email, username, password_hash, role, balance, email_verified, created_at, updated_at)
            VALUES ('expired@example.com', 'expireduser', :pw, 'user', 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
        """),
        {"pw": hashed},
    )
    uid = result.scalar()
    await db_session.execute(
        text("""
            INSERT INTO email_verifications (user_id, code, expires_at, created_at)
            VALUES (:uid, '123456', datetime('now', '-1 hour'), CURRENT_TIMESTAMP)
        """),
        {"uid": uid},
    )
    await db_session.commit()

    response = await client.post(f"{API_PREFIX}/verify-email", json={
        "email": "expired@example.com",
        "code": "123456",
    })
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "CODE_EXPIRED"


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user: dict):
    response = await client.post(f"{API_PREFIX}/login", json={
        "email": "test@example.com",
        "password": "TestPass123",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert "refresh_token" in data["data"]
    assert data["data"]["user"]["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, test_user: dict):
    response = await client.post(f"{API_PREFIX}/login", json={
        "email": "test@example.com",
        "password": "WrongPass123",
    })
    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_login_unverified_email(client: AsyncClient, db_session: AsyncSession):
    from passlib.context import CryptContext
    _pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hashed = _pwd_ctx.hash("TestPass123")
    result = await db_session.execute(
        text("""
            INSERT INTO users (email, username, password_hash, role, balance, email_verified, created_at, updated_at)
            VALUES ('unverified@example.com', 'unverifieduser', :pw, 'user', 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
        """),
        {"pw": hashed},
    )
    await db_session.commit()

    response = await client.post(f"{API_PREFIX}/login", json={
        "email": "unverified@example.com",
        "password": "TestPass123",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["user"]["email"] == "unverified@example.com"


@pytest.mark.asyncio
async def test_login_nonexistent_email(client: AsyncClient):
    response = await client.post(f"{API_PREFIX}/login", json={
        "email": "nobody@example.com",
        "password": "TestPass123",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_with_2fa(client: AsyncClient, db_session: AsyncSession, test_user: dict):
    await db_session.execute(
        text("INSERT INTO user_2fa (user_id, enabled) VALUES (:uid, 1)"),
        {"uid": test_user["id"]},
    )
    await db_session.commit()

    response = await client.post(f"{API_PREFIX}/login", json={
        "email": "test@example.com",
        "password": "TestPass123",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["requires_2fa"] is True


@pytest.mark.asyncio
async def test_verify_2fa_success(client: AsyncClient, db_session: AsyncSession, test_user: dict):
    await db_session.execute(
        text("INSERT INTO user_2fa (user_id, enabled) VALUES (:uid, 1)"),
        {"uid": test_user["id"]},
    )
    await db_session.execute(
        text("""
            INSERT INTO email_verifications (user_id, code, expires_at, purpose, created_at)
            VALUES (:uid, '999999', datetime('now', '+1 hour'), '2fa', CURRENT_TIMESTAMP)
        """),
        {"uid": test_user["id"]},
    )
    await db_session.commit()

    response = await client.post(f"{API_PREFIX}/verify-2fa", json={
        "email": "test@example.com",
        "code": "999999",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "access_token" in data["data"]


@pytest.mark.asyncio
async def test_verify_2fa_invalid_code(client: AsyncClient, test_user: dict):
    response = await client.post(f"{API_PREFIX}/verify-2fa", json={
        "email": "test@example.com",
        "code": "000000",
    })
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_refresh_success(client: AsyncClient, test_user: dict):
    login_resp = await client.post(f"{API_PREFIX}/login", json={
        "email": "test@example.com",
        "password": "TestPass123",
    })
    refresh_token = login_resp.json()["data"]["refresh_token"]

    response = await client.post(f"{API_PREFIX}/refresh", json={
        "refresh_token": refresh_token,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert "refresh_token" in data["data"]


@pytest.mark.asyncio
async def test_refresh_invalid_token(client: AsyncClient):
    response = await client.post(f"{API_PREFIX}/refresh", json={
        "refresh_token": "invalid_token_here",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_logout_success(client: AsyncClient, auth_headers: dict):
    response = await client.post(f"{API_PREFIX}/logout", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["message"] == "Logged out successfully"


@pytest.mark.asyncio
async def test_logout_no_token(client: AsyncClient):
    response = await client.post(f"{API_PREFIX}/logout")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_forgot_password_success(client: AsyncClient, test_user: dict):
    response = await client.post(f"{API_PREFIX}/forgot-password", json={
        "email": "test@example.com",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "Reset code sent" in data["data"]["message"]


@pytest.mark.asyncio
async def test_forgot_password_nonexistent_email(client: AsyncClient):
    response = await client.post(f"{API_PREFIX}/forgot-password", json={
        "email": "nobody@example.com",
    })
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_reset_password_success(client: AsyncClient, db_session: AsyncSession, test_user: dict):
    await db_session.execute(
        text("""
            INSERT INTO password_reset_tokens (user_id, code, expires_at, created_at)
            VALUES (:uid, '555555', datetime('now', '+1 hour'), CURRENT_TIMESTAMP)
        """),
        {"uid": test_user["id"]},
    )
    await db_session.commit()

    response = await client.post(f"{API_PREFIX}/reset-password", json={
        "email": "test@example.com",
        "code": "555555",
        "new_password": "NewPass1234",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "Password reset successfully" in data["data"]["message"]


@pytest.mark.asyncio
async def test_reset_password_wrong_code(client: AsyncClient, db_session: AsyncSession, test_user: dict):
    await db_session.execute(
        text("""
            INSERT INTO password_reset_tokens (user_id, code, expires_at, created_at)
            VALUES (:uid, '555555', datetime('now', '+1 hour'), CURRENT_TIMESTAMP)
        """),
        {"uid": test_user["id"]},
    )
    await db_session.commit()

    response = await client.post(f"{API_PREFIX}/reset-password", json={
        "email": "test@example.com",
        "code": "000000",
        "new_password": "NewPass1234",
    })
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "INVALID_CODE"


@pytest.mark.asyncio
async def test_reset_password_expired_code(client: AsyncClient, db_session: AsyncSession, test_user: dict):
    await db_session.execute(
        text("""
            INSERT INTO password_reset_tokens (user_id, code, expires_at, created_at)
            VALUES (:uid, '555555', datetime('now', '-1 hour'), CURRENT_TIMESTAMP)
        """),
        {"uid": test_user["id"]},
    )
    await db_session.commit()

    response = await client.post(f"{API_PREFIX}/reset-password", json={
        "email": "test@example.com",
        "code": "555555",
        "new_password": "NewPass1234",
    })
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "CODE_EXPIRED"


@pytest.mark.asyncio
async def test_get_me_success(client: AsyncClient, auth_headers: dict, test_user: dict):
    response = await client.get(f"{API_PREFIX}/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["email"] == "test@example.com"
    assert data["data"]["username"] == "testuser"
    assert data["data"]["id"] == test_user["id"]


@pytest.mark.asyncio
async def test_get_me_unauthorized(client: AsyncClient):
    response = await client.get(f"{API_PREFIX}/me")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_me_success(client: AsyncClient, auth_headers: dict):
    response = await client.put(f"{API_PREFIX}/me", headers=auth_headers, json={
        "username": "updateduser",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["message"] == "Profile updated"


@pytest.mark.asyncio
async def test_update_me_unauthorized(client: AsyncClient):
    response = await client.put(f"{API_PREFIX}/me", json={
        "username": "nobody",
    })
    assert response.status_code == 403
