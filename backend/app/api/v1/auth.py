import random
import string
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
from smtplib import SMTP

from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = "CHANGE_ME_IN_PRODUCTION"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 30
VERIFICATION_CODE_EXPIRE_MINUTES = 10

security = HTTPBearer()


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Verify2FARequest(BaseModel):
    email: EmailStr
    code: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UpdateProfileRequest(BaseModel):
    username: str | None = None
    bio: str | None = None


def _generate_code(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


def _create_tokens(user_id: int, email: str, role: str = "user") -> dict:
    now = datetime.now(timezone.utc)
    access_exp = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_exp = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    access_token = jwt.encode(
        {"sub": str(user_id), "email": email, "role": role, "exp": access_exp, "type": "access"},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    refresh_token = jwt.encode(
        {"sub": str(user_id), "exp": refresh_exp, "type": "refresh"},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


def _send_email(to_email: str, subject: str, body: str) -> None:
    try:
        msg = MIMEText(body, "plain", "utf-8")
        msg["Subject"] = subject
        msg["To"] = to_email
        with SMTP("localhost", 25, timeout=10) as smtp:
            smtp.send_message(msg)
    except Exception:
        pass


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        text("SELECT id FROM users WHERE email = :email OR username = :username"),
        {"email": req.email, "username": req.username},
    )
    if existing.scalar():
        raise HTTPException(status_code=409, detail={"success": False, "error": {"code": "EMAIL_OR_USERNAME_EXISTS", "message": "Email or username already registered"}})

    hashed = pwd_context.hash(req.password)
    result = await db.execute(
        text("INSERT INTO users (email, username, password_hash, role, balance, email_verified, created_at, updated_at) VALUES (:email, :username, :pw, 'user', 0, false, NOW(), NOW()) RETURNING id"),
        {"email": req.email, "username": req.username, "pw": hashed},
    )
    user_id = result.scalar()
    code = _generate_code()

    await db.execute(
        text("INSERT INTO email_verifications (user_id, code, expires_at, created_at) VALUES (:uid, :code, :exp, NOW())"),
        {"uid": user_id, "code": code, "exp": datetime.now(timezone.utc) + timedelta(minutes=VERIFICATION_CODE_EXPIRE_MINUTES)},
    )
    await db.commit()

    _send_email(req.email, "Verify your email", f"Your verification code is: {code}")

    return {"success": True, "data": {"message": "Registration successful. Check your email for verification code."}}


@router.post("/verify-email")
async def verify_email(req: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    user = await db.execute(
        text("SELECT id, email_verified FROM users WHERE email = :email"),
        {"email": req.email},
    )
    user_row = user.one_or_none()
    if not user_row:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}})
    if user_row.email_verified:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "ALREADY_VERIFIED", "message": "Email already verified"}})

    verification = await db.execute(
        text("SELECT id, code, expires_at FROM email_verifications WHERE user_id = :uid AND used = false ORDER BY created_at DESC LIMIT 1"),
        {"uid": user_row.id},
    )
    ver_row = verification.one_or_none()
    if not ver_row:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "NO_CODE", "message": "No verification code found. Request a new one."}})
    if ver_row.code != req.code:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "INVALID_CODE", "message": "Invalid verification code"}})
    if ver_row.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "CODE_EXPIRED", "message": "Verification code expired"}})

    await db.execute(
        text("UPDATE users SET email_verified = true WHERE id = :uid"),
        {"uid": user_row.id},
    )
    await db.execute(
        text("UPDATE email_verifications SET used = true WHERE id = :vid"),
        {"vid": ver_row.id},
    )
    await db.commit()

    return {"success": True, "data": {"message": "Email verified successfully"}}


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await db.execute(
        text("SELECT id, email, username, password_hash, role, email_verified FROM users WHERE email = :email"),
        {"email": req.email},
    )
    user_row = user.one_or_none()
    if not user_row or not pwd_context.verify(req.password, user_row.password_hash):
        raise HTTPException(status_code=401, detail={"success": False, "error": {"code": "INVALID_CREDENTIALS", "message": "Invalid email or password"}})

    tfa = await db.execute(
        text("SELECT id, enabled FROM user_2fa WHERE user_id = :uid AND enabled = true"),
        {"uid": user_row.id},
    )
    tfa_row = tfa.scalar()
    if tfa_row:
        code = _generate_code()
        await db.execute(
            text("INSERT INTO email_verifications (user_id, code, expires_at, purpose, created_at) VALUES (:uid, :code, :exp, '2fa', NOW())"),
            {"uid": user_row.id, "code": code, "exp": datetime.now(timezone.utc) + timedelta(minutes=VERIFICATION_CODE_EXPIRE_MINUTES)},
        )
        await db.commit()
        _send_email(req.email, "Your 2FA code", f"Your 2FA code is: {code}")
        return {"success": True, "data": {"requires_2fa": True, "message": "2FA code sent to email"}}

    tokens = _create_tokens(user_row.id, user_row.email, user_row.role)
    await db.execute(
        text("INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) VALUES (:uid, :token, :exp, NOW())"),
        {"uid": user_row.id, "token": tokens["refresh_token"], "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)},
    )
    await db.commit()

    return {"success": True, "data": {"user": {"id": user_row.id, "email": user_row.email, "username": user_row.username, "role": user_row.role}, "tokens": tokens}}


@router.post("/verify-2fa")
async def verify_2fa(req: Verify2FARequest, db: AsyncSession = Depends(get_db)):
    user = await db.execute(
        text("SELECT id, email, username, role FROM users WHERE email = :email"),
        {"email": req.email},
    )
    user_row = user.one_or_none()
    if not user_row:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}})

    ver = await db.execute(
        text("SELECT id, code, expires_at FROM email_verifications WHERE user_id = :uid AND purpose = '2fa' AND used = false ORDER BY created_at DESC LIMIT 1"),
        {"uid": user_row.id},
    )
    ver_row = ver.one_or_none()
    if not ver_row:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "NO_CODE", "message": "No 2FA code found"}})
    if ver_row.code != req.code:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "INVALID_CODE", "message": "Invalid 2FA code"}})
    if ver_row.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "CODE_EXPIRED", "message": "2FA code expired"}})

    await db.execute(text("UPDATE email_verifications SET used = true WHERE id = :vid"), {"vid": ver_row.id})
    tokens = _create_tokens(user_row.id, user_row.email, user_row.role)
    await db.execute(
        text("INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) VALUES (:uid, :token, :exp, NOW())"),
        {"uid": user_row.id, "token": tokens["refresh_token"], "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)},
    )
    await db.commit()

    return {"success": True, "data": {"user": {"id": user_row.id, "email": user_row.email, "username": user_row.username, "role": user_row.role}, "tokens": tokens}}


@router.post("/refresh")
async def refresh_token(req: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    try:
        payload = jwt.decode(req.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail={"success": False, "error": {"code": "INVALID_TOKEN", "message": "Invalid token type"}})
    except JWTError:
        raise HTTPException(status_code=401, detail={"success": False, "error": {"code": "INVALID_TOKEN", "message": "Invalid or expired refresh token"}})

    user_id = int(payload["sub"])
    stored = await db.execute(
        text("SELECT id FROM refresh_tokens WHERE token = :token AND revoked = false AND expires_at > NOW()"),
        {"token": req.refresh_token},
    )
    if not stored.scalar():
        raise HTTPException(status_code=401, detail={"success": False, "error": {"code": "TOKEN_REVOKED", "message": "Refresh token revoked or expired"}})

    user = await db.execute(
        text("SELECT id, email, role FROM users WHERE id = :uid"),
        {"uid": user_id},
    )
    user_row = user.one_or_none()
    if not user_row:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}})

    await db.execute(
        text("UPDATE refresh_tokens SET revoked = true WHERE token = :token"),
        {"token": req.refresh_token},
    )

    tokens = _create_tokens(user_row.id, user_row.email, user_row.role)
    await db.execute(
        text("INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) VALUES (:uid, :token, :exp, NOW())"),
        {"uid": user_row.id, "token": tokens["refresh_token"], "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)},
    )
    await db.commit()

    return {"success": True, "data": tokens}


@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security), db: AsyncSession = Depends(get_db)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401)
    except JWTError:
        raise HTTPException(status_code=401, detail={"success": False, "error": {"code": "INVALID_TOKEN", "message": "Invalid token"}})

    await db.execute(
        text("UPDATE refresh_tokens SET revoked = true WHERE user_id = :uid"),
        {"uid": int(payload["sub"])},
    )
    await db.commit()

    return {"success": True, "data": {"message": "Logged out successfully"}}


@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    user = await db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": req.email},
    )
    user_row = user.one_or_none()
    if not user_row:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}})

    code = _generate_code()
    await db.execute(
        text("INSERT INTO password_reset_tokens (user_id, code, expires_at, created_at) VALUES (:uid, :code, :exp, NOW())"),
        {"uid": user_row.id, "code": code, "exp": datetime.now(timezone.utc) + timedelta(minutes=VERIFICATION_CODE_EXPIRE_MINUTES)},
    )
    await db.commit()

    _send_email(req.email, "Password reset code", f"Your password reset code is: {code}")

    return {"success": True, "data": {"message": "Reset code sent to email"}}


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    user = await db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": req.email},
    )
    user_row = user.one_or_none()
    if not user_row:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}})

    reset = await db.execute(
        text("SELECT id, code, expires_at FROM password_reset_tokens WHERE user_id = :uid AND used = false ORDER BY created_at DESC LIMIT 1"),
        {"uid": user_row.id},
    )
    reset_row = reset.one_or_none()
    if not reset_row:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "NO_CODE", "message": "No reset code found"}})
    if reset_row.code != req.code:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "INVALID_CODE", "message": "Invalid reset code"}})
    if reset_row.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "CODE_EXPIRED", "message": "Reset code expired"}})

    hashed = pwd_context.hash(req.new_password)
    await db.execute(
        text("UPDATE users SET password_hash = :pw WHERE id = :uid"),
        {"pw": hashed, "uid": user_row.id},
    )
    await db.execute(
        text("UPDATE password_reset_tokens SET used = true WHERE id = :rid"),
        {"rid": reset_row.id},
    )
    await db.execute(
        text("UPDATE refresh_tokens SET revoked = true WHERE user_id = :uid"),
        {"uid": user_row.id},
    )
    await db.commit()

    return {"success": True, "data": {"message": "Password reset successfully"}}


@router.get("/me")
async def get_me(user_id: int = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await db.execute(
        text("SELECT id, email, username, avatar_url, role, balance, email_verified, bio, created_at FROM users WHERE id = :uid"),
        {"uid": user_id},
    )
    row = user.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}})

    return {
        "success": True,
        "data": {
            "id": row.id,
            "email": row.email,
            "username": row.username,
            "avatar_url": row.avatar_url,
            "role": row.role,
            "balance": float(row.balance) if row.balance else 0,
            "email_verified": row.email_verified,
            "bio": row.bio,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        },
    }


@router.put("/me")
async def update_me(req: UpdateProfileRequest, user_id: int = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await db.execute(
        text("SELECT id FROM users WHERE id = :uid"),
        {"uid": user_id},
    )
    if not user.scalar():
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}})

    updates = {}
    if req.username is not None:
        existing = await db.execute(
            text("SELECT id FROM users WHERE username = :un AND id != :uid"),
            {"un": req.username, "uid": user_id},
        )
        if existing.scalar():
            raise HTTPException(status_code=409, detail={"success": False, "error": {"code": "USERNAME_EXISTS", "message": "Username already taken"}})
        updates["username"] = req.username
    if req.bio is not None:
        updates["bio"] = req.bio

    if updates:
        set_clause = ", ".join(f"{k} = :{k}" for k in updates)
        updates["uid"] = user_id
        await db.execute(
            text(f"UPDATE users SET {set_clause}, updated_at = NOW() WHERE id = :uid"),
            updates,
        )
        await db.commit()

    return {"success": True, "data": {"message": "Profile updated"}}
