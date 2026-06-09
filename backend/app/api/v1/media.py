import hashlib
import io
import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import Response
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user

router = APIRouter(tags=["media"])

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
AVATAR_DIR = os.path.join(UPLOAD_DIR, "avatars")
COVER_DIR = os.path.join(UPLOAD_DIR, "covers")
GALLERY_DIR = os.path.join(UPLOAD_DIR, "gallery")
TICKET_DIR = os.path.join(UPLOAD_DIR, "tickets")

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_FILE_SIZE = 10 * 1024 * 1024

MAGIC_BYTES = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"GIF87a": "image/gif",
    b"GIF89a": "image/gif",
    b"RIFF": "image/webp",
}


def _detect_mime(data: bytes) -> str | None:
    for magic, mime in MAGIC_BYTES.items():
        if data.startswith(magic):
            return mime
    return None


def _get_ext(mime: str) -> str:
    return {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def _ensure_dirs() -> None:
    for d in (AVATAR_DIR, COVER_DIR, GALLERY_DIR, TICKET_DIR):
        os.makedirs(d, exist_ok=True)


async def _serve_image(filepath: str) -> Response:
    if not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "NOT_FOUND", "message": "Image not found"}})

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


_ensure_dirs()


@router.get("/avatar/{user_id}")
async def get_avatar(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await db.execute(
        text("SELECT avatar_url FROM users WHERE id = :uid"),
        {"uid": user_id},
    )
    row = user.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}})

    if row.avatar_url and os.path.isfile(row.avatar_url):
        return await _serve_image(row.avatar_url)

    initials = (row.avatar_url or "U")[0].upper()
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="#6366f1" rx="100"/>
    <text x="100" y="120" font-size="80" fill="white" text-anchor="middle" font-family="Arial">{initials}</text>
</svg>"""
    return Response(content=svg, media_type="image/svg+xml", headers={"Cache-Control": "public, max-age=86400"})


@router.get("/mod/{mod_id}/cover")
async def get_cover(mod_id: int, db: AsyncSession = Depends(get_db)):
    mod = await db.execute(
        text("SELECT cover_url FROM mods WHERE id = :mid AND deleted_at IS NULL"),
        {"mid": mod_id},
    )
    row = mod.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "NOT_FOUND", "message": "Mod or cover not found"}})

    if row.cover_url and os.path.isfile(row.cover_url):
        return await _serve_image(row.cover_url)

    raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "NOT_FOUND", "message": "Cover image not found"}})


@router.get("/mod/{mod_id}/gallery/{image_id}")
async def get_gallery_image(mod_id: int, image_id: int, db: AsyncSession = Depends(get_db)):
    img = await db.execute(
        text("SELECT id, url FROM mod_images WHERE id = :iid AND mod_id = :mid"),
        {"iid": image_id, "mid": mod_id},
    )
    row = img.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "NOT_FOUND", "message": "Gallery image not found"}})

    if row.url and os.path.isfile(row.url):
        return await _serve_image(row.url)

    raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "NOT_FOUND", "message": "Gallery image file not found"}})


@router.get("/ticket/{ticket_id}/{image_id}")
async def get_ticket_image(ticket_id: int, image_id: int, db: AsyncSession = Depends(get_db)):
    img_path = os.path.join(TICKET_DIR, str(ticket_id), str(image_id))
    for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        fp = img_path + ext
        if os.path.isfile(fp):
            return await _serve_image(fp)

    raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "NOT_FOUND", "message": "Ticket image not found"}})


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    purpose: str = "avatar",
    mod_id: int | None = None,
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if purpose not in ("avatar", "cover", "gallery", "ticket"):
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "INVALID_PURPOSE", "message": "Purpose must be one of: avatar, cover, gallery, ticket"}})

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "FILE_TOO_LARGE", "message": f"File size exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit"}})

    detected_mime = _detect_mime(data)
    if not detected_mime or detected_mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "INVALID_FORMAT", "message": "Invalid image format. Allowed: JPEG, PNG, WebP, GIF"}})

    ext_map = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
    ext = ext_map[detected_mime]
    filename = f"{uuid.uuid4().hex}{ext}"

    if purpose == "avatar":
        user = await db.execute(text("SELECT avatar_url FROM users WHERE id = :uid"), {"uid": user_id})
        user_row = user.one_or_none()
        if not user_row:
            raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found"}})

        old_path = user_row.avatar_url
        if old_path and os.path.isfile(old_path):
            try:
                os.remove(old_path)
            except OSError:
                pass

        filepath = os.path.join(AVATAR_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(data)

        await db.execute(
            text("UPDATE users SET avatar_url = :url, updated_at = NOW() WHERE id = :uid"),
            {"url": filepath, "uid": user_id},
        )
        await db.commit()

        return {"success": True, "data": {"url": f"/media/avatar/{user_id}", "path": filepath}}

    elif purpose == "cover":
        if not mod_id:
            raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "MOD_ID_REQUIRED", "message": "mod_id is required for cover upload"}})

        mod = await db.execute(
            text("SELECT id, cover_url, author_id FROM mods WHERE id = :mid AND deleted_at IS NULL"),
            {"mid": mod_id},
        )
        mod_row = mod.one_or_none()
        if not mod_row:
            raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}})
        if mod_row.author_id != user_id:
            raise HTTPException(status_code=403, detail={"success": False, "error": {"code": "FORBIDDEN", "message": "Only the author can change the cover"}})

        old_path = mod_row.cover_url
        if old_path and os.path.isfile(old_path):
            try:
                os.remove(old_path)
            except OSError:
                pass

        filepath = os.path.join(COVER_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(data)

        await db.execute(
            text("UPDATE mods SET cover_url = :url, updated_at = NOW() WHERE id = :mid"),
            {"url": filepath, "mid": mod_id},
        )
        await db.commit()

        return {"success": True, "data": {"url": f"/media/mod/{mod_id}/cover", "path": filepath}}

    elif purpose == "gallery":
        if not mod_id:
            raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "MOD_ID_REQUIRED", "message": "mod_id is required for gallery upload"}})

        mod = await db.execute(
            text("SELECT id, author_id FROM mods WHERE id = :mid AND deleted_at IS NULL"),
            {"mid": mod_id},
        )
        mod_row = mod.one_or_none()
        if not mod_row:
            raise HTTPException(status_code=404, detail={"success": False, "error": {"code": "MOD_NOT_FOUND", "message": "Mod not found"}})
        if mod_row.author_id != user_id:
            raise HTTPException(status_code=403, detail={"success": False, "error": {"code": "FORBIDDEN", "message": "Only the author can add gallery images"}})

        filepath = os.path.join(GALLERY_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(data)

        result = await db.execute(
            text("""
                INSERT INTO mod_images (mod_id, url, sort_order, created_at)
                VALUES (:mid, :url, COALESCE((SELECT MAX(sort_order) + 1 FROM mod_images WHERE mod_id = :mid2), 0), NOW())
                RETURNING id
            """),
            {"mid": mod_id, "url": filepath, "mid2": mod_id},
        )
        image_id = result.scalar()
        await db.commit()

        return {"success": True, "data": {"image_id": image_id, "url": f"/media/mod/{mod_id}/gallery/{image_id}"}}

    elif purpose == "ticket":
        ticket_id = mod_id
        if not ticket_id:
            raise HTTPException(status_code=400, detail={"success": False, "error": {"code": "TICKET_ID_REQUIRED", "message": "mod_id (ticket_id) is required for ticket upload"}})

        ticket_dir = os.path.join(TICKET_DIR, str(ticket_id))
        os.makedirs(ticket_dir, exist_ok=True)
        filepath = os.path.join(ticket_dir, filename)
        with open(filepath, "wb") as f:
            f.write(data)

        return {"success": True, "data": {"url": f"/media/ticket/{ticket_id}/{os.path.splitext(filename)[0]}"}}
