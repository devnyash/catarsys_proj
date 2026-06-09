import hashlib
import io
import os
import uuid

from fastapi import HTTPException, status, UploadFile
from fastapi.responses import Response
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.user_repo import UserRepository
from app.repositories.media_repo import MediaRepository


MAGIC_BYTES: dict[bytes, str] = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"GIF87a": "image/gif",
    b"GIF89a": "image/gif",
    b"RIFF": "image/webp",
}

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE = 10 * 1024 * 1024

EXT_MAP = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
AVATAR_DIR = os.path.join(UPLOAD_DIR, "avatars")
COVER_DIR = os.path.join(UPLOAD_DIR, "covers")
GALLERY_DIR = os.path.join(UPLOAD_DIR, "gallery")
TICKET_DIR = os.path.join(UPLOAD_DIR, "tickets")


def _ensure_dirs() -> None:
    for d in (AVATAR_DIR, COVER_DIR, GALLERY_DIR, TICKET_DIR):
        os.makedirs(d, exist_ok=True)


def _detect_mime(data: bytes) -> str | None:
    for magic, mime in MAGIC_BYTES.items():
        if data.startswith(magic):
            return mime
    return None


_ensure_dirs()


class MediaService:
    def __init__(self):
        self.user_repo = UserRepository()
        self.media_repo = MediaRepository()

    async def _serve_image(self, filepath: str) -> Response:
        if not os.path.isfile(filepath):
            raise HTTPException(status_code=404, detail={
                "success": False, "error": {"code": "NOT_FOUND", "message": "Image not found"}
            })

        with open(filepath, "rb") as f:
            data = f.read()

        mime = _detect_mime(data) or "application/octet-stream"
        etag = hashlib.md5(data).hexdigest()

        return Response(
            content=data,
            media_type=mime,
            headers={
                "Cache-Control": "public, max-age=31536000, immutable",
                "ETag": etag,
                "Content-Length": str(len(data)),
            },
        )

    async def get_avatar(self, db: AsyncSession, user_id: int) -> Response:
        user = await self.user_repo.get_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail={
                "success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}
            })

        if user.avatar_media_id:
            media = await self.media_repo.get_by_id(db, user.avatar_media_id)
            if media and media.data:
                mime = media.mime_type
                etag = hashlib.md5(media.data).hexdigest()
                return Response(
                    content=media.data,
                    media_type=mime,
                    headers={
                        "Cache-Control": "public, max-age=31536000, immutable",
                        "ETag": etag,
                        "Content-Length": str(len(media.data)),
                    },
                )

        initials = user.username[0].upper() if user.username else "U"
        svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="#6366f1" rx="100"/>
    <text x="100" y="120" font-size="80" fill="white" text-anchor="middle" font-family="Arial">{initials}</text>
</svg>"""
        return Response(content=svg, media_type="image/svg+xml", headers={"Cache-Control": "public, max-age=86400"})

    async def get_mod_cover(self, db: AsyncSession, mod_id: int) -> Response:
        mod = await db.execute(
            text("SELECT id, cover_media_id FROM mods WHERE id = :mid AND is_deleted = false"),
            {"mid": mod_id},
        )
        row = mod.one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail={
                "success": False, "error": {"code": "NOT_FOUND", "message": "Mod not found"}
            })

        if row.cover_media_id:
            media = await self.media_repo.get_by_id(db, row.cover_media_id)
            if media and media.data:
                mime = media.mime_type
                etag = hashlib.md5(media.data).hexdigest()
                return Response(
                    content=media.data,
                    media_type=mime,
                    headers={
                        "Cache-Control": "public, max-age=31536000, immutable",
                        "ETag": etag,
                        "Content-Length": str(len(media.data)),
                    },
                )

        raise HTTPException(status_code=404, detail={
            "success": False, "error": {"code": "NOT_FOUND", "message": "Cover image not found"}
        })

    async def get_gallery_image(self, db: AsyncSession, mod_id: int, image_id: int) -> Response:
        media = await self.media_repo.get_by_id(db, image_id)
        if not media or media.entity_type != "mod_screenshot" or media.entity_id != mod_id:
            raise HTTPException(status_code=404, detail={
                "success": False, "error": {"code": "NOT_FOUND", "message": "Gallery image not found"}
            })

        if media.data:
            mime = media.mime_type
            etag = hashlib.md5(media.data).hexdigest()
            return Response(
                content=media.data,
                media_type=mime,
                headers={
                    "Cache-Control": "public, max-age=31536000, immutable",
                    "ETag": etag,
                    "Content-Length": str(len(media.data)),
                },
            )

        raise HTTPException(status_code=404, detail={
            "success": False, "error": {"code": "NOT_FOUND", "message": "Gallery image file not found"}
        })

    async def upload(
        self,
        db: AsyncSession,
        user_id: int,
        file: UploadFile,
        entity_type: str,
        entity_id: int | None = None,
    ) -> dict:
        if entity_type not in ("user_avatar", "mod_cover", "mod_screenshot", "mod_file"):
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "INVALID_ENTITY_TYPE", "message": "Invalid entity type"}
            })

        data = await file.read()
        if len(data) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "FILE_TOO_LARGE", "message": f"File size exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit"}
            })

        detected_mime = _detect_mime(data)
        if not detected_mime or detected_mime not in ALLOWED_MIME_TYPES:
            raise HTTPException(status_code=400, detail={
                "success": False, "error": {"code": "INVALID_FORMAT", "message": "Invalid image format. Allowed: JPEG, PNG, WebP, GIF"}
            })

        ext = EXT_MAP[detected_mime]
        filename = f"{uuid.uuid4().hex}{ext}"

        if entity_type == "user_avatar":
            user = await self.user_repo.get_by_id(db, user_id)
            if not user:
                raise HTTPException(status_code=404, detail={
                    "success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}
                })

            # Delete old avatar media
            if user.avatar_media_id:
                old_media = await self.media_repo.get_by_id(db, user.avatar_media_id)
                if old_media:
                    await self.media_repo.delete(db, old_media.id)

            filepath = os.path.join(AVATAR_DIR, filename)
            with open(filepath, "wb") as f:
                f.write(data)

            # Also store reference in media table
            media = await self.media_repo.create(
                db,
                entity_type="user_avatar",
                entity_id=user_id,
                sort_order=0,
                mime_type=detected_mime,
                file_size=len(data),
                data=data,
            )

            await self.user_repo.update_avatar_media(db, user_id, media.id)
            await db.commit()

            return {"success": True, "data": {"url": f"/media/avatar/{user_id}", "media_id": media.id}}

        elif entity_type == "mod_cover":
            if not entity_id:
                raise HTTPException(status_code=400, detail={
                    "success": False, "error": {"code": "ENTITY_ID_REQUIRED", "message": "entity_id (mod_id) is required for mod_cover"}
                })

            mod = await db.execute(
                text("SELECT id, author_id, cover_media_id FROM mods WHERE id = :mid AND is_deleted = false"),
                {"mid": entity_id},
            )
            mod_row = mod.one_or_none()
            if not mod_row:
                raise HTTPException(status_code=404, detail={
                    "success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}
                })
            if mod_row.author_id != user_id:
                raise HTTPException(status_code=403, detail={
                    "success": False, "error": {"code": "FORBIDDEN", "message": "Only the author can change the cover"}
                })

            if mod_row.cover_media_id:
                old_media = await self.media_repo.get_by_id(db, mod_row.cover_media_id)
                if old_media:
                    await self.media_repo.delete(db, old_media.id)

            filepath = os.path.join(COVER_DIR, filename)
            with open(filepath, "wb") as f:
                f.write(data)

            media = await self.media_repo.create(
                db,
                entity_type="mod_cover",
                entity_id=entity_id,
                sort_order=0,
                mime_type=detected_mime,
                file_size=len(data),
                data=data,
            )

            await db.execute(
                text("UPDATE mods SET cover_media_id = :mid, updated_at = NOW() WHERE id = :mod_id"),
                {"mid": media.id, "mod_id": entity_id},
            )
            await db.commit()

            return {"success": True, "data": {"url": f"/media/mod/{entity_id}/cover", "media_id": media.id}}

        elif entity_type == "mod_screenshot":
            if not entity_id:
                raise HTTPException(status_code=400, detail={
                    "success": False, "error": {"code": "ENTITY_ID_REQUIRED", "message": "entity_id (mod_id) is required for mod_screenshot"}
                })

            mod = await db.execute(
                text("SELECT id, author_id FROM mods WHERE id = :mid AND is_deleted = false"),
                {"mid": entity_id},
            )
            mod_row = mod.one_or_none()
            if not mod_row:
                raise HTTPException(status_code=404, detail={
                    "success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}
                })
            if mod_row.author_id != user_id:
                raise HTTPException(status_code=403, detail={
                    "success": False, "error": {"code": "FORBIDDEN", "message": "Only the author can add gallery images"}
                })

            filepath = os.path.join(GALLERY_DIR, filename)
            with open(filepath, "wb") as f:
                f.write(data)

            max_sort = await db.execute(
                text("SELECT COALESCE(MAX(sort_order) + 1, 0) FROM mod_images WHERE mod_id = :mid"),
                {"mid": entity_id},
            )
            next_sort = max_sort.scalar() or 0

            media = await self.media_repo.create(
                db,
                entity_type="mod_screenshot",
                entity_id=entity_id,
                sort_order=next_sort,
                mime_type=detected_mime,
                file_size=len(data),
                data=data,
            )
            await db.commit()

            return {"success": True, "data": {"media_id": media.id, "url": f"/media/mod/{entity_id}/gallery/{media.id}"}}

        return {"success": False, "error": {"code": "UNSUPPORTED", "message": "Unsupported entity type"}}

    async def delete_media(self, db: AsyncSession, media_id: int) -> dict:
        media = await self.media_repo.get_by_id(db, media_id)
        if not media:
            raise HTTPException(status_code=404, detail={
                "success": False, "error": {"code": "NOT_FOUND", "message": "Media not found"}
            })

        await self.media_repo.delete(db, media_id)
        await db.commit()

        return {"success": True, "data": {"message": "Media deleted"}}
