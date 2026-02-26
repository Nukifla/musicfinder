import os
from fastapi import APIRouter, HTTPException, UploadFile, File
from models import CookieStatus
from config import settings

router = APIRouter(prefix="/api/cookies", tags=["cookies"])

MAX_SIZE = 5 * 1024 * 1024  # 5 MB


@router.get("/status", response_model=CookieStatus)
async def cookie_status():
    path = settings.cookies_path
    if not os.path.exists(path):
        return CookieStatus(present=False, size_bytes=None, valid=False)

    size = os.path.getsize(path)
    try:
        with open(path, "r", encoding="utf-8") as f:
            first_line = f.readline()
        valid = "# Netscape HTTP Cookie File" in first_line
    except Exception:
        valid = False

    return CookieStatus(present=True, size_bytes=size, valid=valid)


@router.post("/upload")
async def upload_cookies(file: UploadFile = File(...)):
    content = await file.read()

    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="Cookie file too large (max 5 MB)")

    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Cookie file must be valid UTF-8")

    if "# Netscape HTTP Cookie File" not in text[:100]:
        raise HTTPException(
            status_code=400,
            detail="Invalid cookie file: must start with '# Netscape HTTP Cookie File'",
        )

    os.makedirs(os.path.dirname(settings.cookies_path), exist_ok=True)
    with open(settings.cookies_path, "wb") as f:
        f.write(content)

    return {"uploaded": True, "size_bytes": len(content)}
