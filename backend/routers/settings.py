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
        path_template=data.get("path_template", "{artist}/{album}/{track} {title}"),
        default_format=data.get("default_format", "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio"),
        search_artist_images=data.get("search_artist_images", "false").lower() == "true",
    )


@router.put("", response_model=SettingsModel)
async def update_settings(body: SettingsModel):
    db = await get_db()
    values = {
        "path_template": body.path_template,
        "default_format": body.default_format,
        "search_artist_images": "true" if body.search_artist_images else "false",
    }
    for key, value in values.items():
        await db.execute(
            "INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, value),
        )
    await db.commit()
    return body
