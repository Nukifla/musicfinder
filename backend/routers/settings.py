from fastapi import APIRouter
from models import SettingsModel
from database import get_db

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=SettingsModel)
async def get_settings():
    db = await get_db()
    async with db.execute("SELECT key, value FROM settings") as cur:
        rows = await cur.fetchall()
    data = {r["key"]: r["value"] for r in rows}
    return SettingsModel(
        path_template=data.get("path_template", "{artist}/{album}/{track:02d} {title}"),
        default_format=data.get("default_format", "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio"),
    )


@router.put("", response_model=SettingsModel)
async def update_settings(body: SettingsModel):
    db = await get_db()
    for key, value in body.model_dump().items():
        await db.execute(
            "INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, value),
        )
    await db.commit()
    return body
