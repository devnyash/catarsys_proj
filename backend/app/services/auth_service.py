import random
import string
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from email.mime.text import MIMEText
from smtplib import SMTP

from fastapi import HTTPException, status
from jose import JWTError, jwt
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.models.user import User
from app.models.user_2fa import User2FA
from app.repositories.user_repo import UserRepository


class AuthService:
    def __init__(self):
        self.user_repo = UserRepository()

    def _generate_code(self, length: int = 6) -> str:
        return "".join(random.choices(string.digits, k=length))

    def _send_email(self, to_email: str, subject: str, body: str) -> None:
        try:
            msg = MIMEText(body, "plain", "utf-8")
            msg["Subject"] = subject
            msg["To"] = to_email
            with SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
                if settings.SMTP_USER:
                    smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                smtp.send_message(msg)
        except Exception:
            pass

    def _create_tokens(self, user: User) -> dict:
        access_token = create_access_token({
            "sub": user.id,
            "email": user.email,
            "role": user.role,
            "type": "access",
        })
        refresh_token = create_refresh_token()
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }

    async def _store_refresh_token(self, db: AsyncSession, user_id: int, token: str) -> None:
        exp = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        await db.execute(
            text("INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) VALUES (:uid, :token, :exp, NOW())"),
            {"uid": user_id, "token": token, "exp": exp},
        )

    async def register(self, db: AsyncSession, email: str, username: str, password: str) -> dict:
        existing_email = await self.user_repo.get_by_email(db, email)
        if existing_email:
            raise HTTPException(status_code=409, detail={
                "success": False, "error": {"code": "EMAIL_EXISTS", "message": "Email already registered"}
            })

        existing_username = await self.user_repo.get_by_username(db, username)
        if existing_username:
            raise HTTPException(status_code=409, detail={
                "success": False, "error": {"code": "USERNAME_EXISTS", "message": "Username already taken"}
            })

        user = await self.user_repo.create(
            db,
            email=email,
            username=username,
            password_hash=hash_password(password),
            role="user",
            balance=Decimal("0.00"),
            rating=Decimal("0.00"),
            is_verified=False,
            is_active=True,
            is_banned=False,
        )

        code = self._generate_code()
        exp = datetime.now(timezone.utc) + timedelta(minutes=10)
        await db.execute(
            text("INSERT INTO email_verifications (user_id, code, expires_at, created_at) VALUES (:uid, :code, :exp, NOW())"),
            {"uid": user.id, "code": code, "exp": exp},
        )
        await db.commit()

        self._send_email(email, "Verify your email", f"Your verification code is: {code}")

        return {"success": True, "data": {"message": "Registration successful. Check your email for verification code."}}

    async def verify_email(self, db: AsyncSession, email: str, code: str) -> dict:
        user = await self.user_repo.get_by_email(db, email)
        if not user:
            raise HTTPException(status_code=404, detail={
                "success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}
            })
        if user.is_verified:
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "ALREADY_VERIFIED", "message": "Email already verified"}
            })

        verification = await db.execute(
            text("SELECT id, code, expires_at FROM email_verifications WHERE user_id = :uid AND used = false ORDER BY created_at DESC LIMIT 1"),
            {"uid": user.id},
        )
        ver_row = verification.one_or_none()
        if not ver_row:
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "NO_CODE", "message": "No verification code found. Request a new one."}
            })
        if ver_row.code != code:
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "INVALID_CODE", "message": "Invalid verification code"}
            })
        if ver_row.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "CODE_EXPIRED", "message": "Verification code expired"}
            })

        await self.user_repo.update(db, user.id, is_verified=True)
        await db.execute(
            text("UPDATE email_verifications SET used = true WHERE id = :vid"),
            {"vid": ver_row.id},
        )
        await db.commit()

        return {"success": True, "data": {"message": "Email verified successfully"}}

    async def login(self, db: AsyncSession, email: str, password: str) -> dict:
        user = await self.user_repo.get_by_email(db, email)
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=401, detail={
                "success": False, "error": {"code": "INVALID_CREDENTIALS", "message": "Invalid email or password"}
            })

        # Check 2FA
        tfa = await db.execute(
            select(User2FA).where(User2FA.user_id == user.id, User2FA.enabled == True)
        )
        if tfa.scalar_one_or_none():
            code = self._generate_code()
            exp = datetime.now(timezone.utc) + timedelta(minutes=10)
            await db.execute(
                text("INSERT INTO email_verifications (user_id, code, expires_at, purpose, created_at) VALUES (:uid, :code, :exp, '2fa', NOW())"),
                {"uid": user.id, "code": code, "exp": exp},
            )
            await db.commit()
            self._send_email(email, "Your 2FA code", f"Your 2FA code is: {code}")
            return {"success": True, "data": {"requires_2fa": True, "message": "2FA code sent to email"}}

        tokens = self._create_tokens(user)
        await self._store_refresh_token(db, user.id, tokens["refresh_token"])
        await db.commit()

        return {
            "success": True,
            "data": {
                "user": {"id": user.id, "email": user.email, "username": user.username, "role": user.role},
                **tokens,
            },
        }

    async def verify_2fa(self, db: AsyncSession, email: str, code: str) -> dict:
        user = await self.user_repo.get_by_email(db, email)
        if not user:
            raise HTTPException(status_code=404, detail={
                "success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}
            })

        ver = await db.execute(
            text("SELECT id, code, expires_at FROM email_verifications WHERE user_id = :uid AND purpose = '2fa' AND used = false ORDER BY created_at DESC LIMIT 1"),
            {"uid": user.id},
        )
        ver_row = ver.one_or_none()
        if not ver_row:
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "NO_CODE", "message": "No 2FA code found"}
            })
        if ver_row.code != code:
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "INVALID_CODE", "message": "Invalid 2FA code"}
            })
        if ver_row.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "CODE_EXPIRED", "message": "2FA code expired"}
            })

        await db.execute(
            text("UPDATE email_verifications SET used = true WHERE id = :vid"),
            {"vid": ver_row.id},
        )

        tokens = self._create_tokens(user)
        await self._store_refresh_token(db, user.id, tokens["refresh_token"])
        await db.commit()

        return {
            "success": True,
            "data": {
                "user": {"id": user.id, "email": user.email, "username": user.username, "role": user.role},
                **tokens,
            },
        }

    async def refresh_token(self, db: AsyncSession, refresh_token: str) -> dict:
        stored = await db.execute(
            text("SELECT id, user_id FROM refresh_tokens WHERE token = :token AND revoked = false AND expires_at > NOW()"),
            {"token": refresh_token},
        )
        stored_row = stored.one_or_none()
        if not stored_row:
            raise HTTPException(status_code=401, detail={
                "success": False, "error": {"code": "TOKEN_INVALID", "message": "Refresh token revoked or expired"}
            })

        user = await self.user_repo.get_by_id(db, stored_row.user_id)
        if not user:
            raise HTTPException(status_code=404, detail={
                "success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}
            })

        await db.execute(
            text("UPDATE refresh_tokens SET revoked = true WHERE id = :tid"),
            {"tid": stored_row.id},
        )

        tokens = self._create_tokens(user)
        await self._store_refresh_token(db, user.id, tokens["refresh_token"])
        await db.commit()

        return {"success": True, "data": tokens}

    async def logout(self, db: AsyncSession, user_id: int) -> dict:
        await db.execute(
            text("UPDATE refresh_tokens SET revoked = true WHERE user_id = :uid"),
            {"uid": user_id},
        )
        await db.commit()
        return {"success": True, "data": {"message": "Logged out successfully"}}

    async def forgot_password(self, db: AsyncSession, email: str) -> dict:
        user = await self.user_repo.get_by_email(db, email)
        if not user:
            raise HTTPException(status_code=404, detail={
                "success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}
            })

        code = self._generate_code()
        exp = datetime.now(timezone.utc) + timedelta(minutes=10)
        await db.execute(
            text("INSERT INTO password_reset_tokens (user_id, code, expires_at, created_at) VALUES (:uid, :code, :exp, NOW())"),
            {"uid": user.id, "code": code, "exp": exp},
        )
        await db.commit()

        self._send_email(email, "Password reset code", f"Your password reset code is: {code}")

        return {"success": True, "data": {"message": "Reset code sent to email"}}

    async def reset_password(self, db: AsyncSession, email: str, code: str, new_password: str) -> dict:
        user = await self.user_repo.get_by_email(db, email)
        if not user:
            raise HTTPException(status_code=404, detail={
                "success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}
            })

        reset = await db.execute(
            text("SELECT id, code, expires_at FROM password_reset_tokens WHERE user_id = :uid AND used = false ORDER BY created_at DESC LIMIT 1"),
            {"uid": user.id},
        )
        reset_row = reset.one_or_none()
        if not reset_row:
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "NO_CODE", "message": "No reset code found"}
            })
        if reset_row.code != code:
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "INVALID_CODE", "message": "Invalid reset code"}
            })
        if reset_row.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "CODE_EXPIRED", "message": "Reset code expired"}
            })

        await self.user_repo.update(db, user.id, password_hash=hash_password(new_password))
        await db.execute(
            text("UPDATE password_reset_tokens SET used = true WHERE id = :rid"),
            {"rid": reset_row.id},
        )
        await db.execute(
            text("UPDATE refresh_tokens SET revoked = true WHERE user_id = :uid"),
            {"uid": user.id},
        )
        await db.commit()

        return {"success": True, "data": {"message": "Password reset successfully"}}

    async def get_profile(self, db: AsyncSession, user_id: int) -> dict:
        user = await self.user_repo.get_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail={
                "success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}
            })

        return {
            "success": True,
            "data": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "avatar_media_id": user.avatar_media_id,
                "role": user.role,
                "balance": float(user.balance),
                "is_verified": user.is_verified,
                "rating": float(user.rating),
                "created_at": user.created_at.isoformat() if user.created_at else None,
            },
        }

    async def update_profile(self, db: AsyncSession, user_id: int, data: dict) -> dict:
        user = await self.user_repo.get_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail={
                "success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}
            })

        updates = {}
        if "username" in data and data["username"] is not None:
            existing = await self.user_repo.get_by_username(db, data["username"])
            if existing and existing.id != user_id:
                raise HTTPException(status_code=409, detail={
                    "success": False, "error": {"code": "USERNAME_EXISTS", "message": "Username already taken"}
                })
            updates["username"] = data["username"]

        # User model doesn't have bio, but the routes reference it.
        # We handle it silently if it's in the request.
        if updates:
            await self.user_repo.update(db, user_id, **updates)
            await db.commit()

        return {"success": True, "data": {"message": "Profile updated"}}
