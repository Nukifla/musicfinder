import asyncio
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel
from rapidfuzz import fuzz

from config import settings
from database import get_db
from services.library_scanner import scan_library, is_scanning

router = APIRouter(prefix="/api/library", tags=["library"])


class TrackCheck(BaseModel):
    mbid: str
    title: str
    artist: str


class CheckRequest(BaseModel):
    tracks: list[TrackCheck]


@router.post("/scan")
async def trigger_scan():
    if is_scanning():
        return {"status": "already_running"}
    db = await get_db()
    asyncio.create_task(scan_library(settings.music_dir, db))
    return {"status": "started"}


@router.get("/status")
async def scan_status():
    db = await get_db()
    async with db.execute(
        "SELECT key, value FROM library_meta WHERE key IN ('last_scan','file_count')"
    ) as cur:
        rows = {r["key"]: r["value"] for r in await cur.fetchall()}
    return {
        "last_scan": rows.get("last_scan"),
        "file_count": int(rows.get("file_count", 0)),
        "scanning": is_scanning(),
    }


@router.post("/check")
async def check_library(req: CheckRequest):
    if not req.tracks:
        return {"matched": []}

    db = await get_db()
    mbids = [t.mbid for t in req.tracks if t.mbid]

    matched: set[str] = set()

    # 1. Exact MBID match in library table
    if mbids:
        placeholders = ",".join("?" * len(mbids))
        async with db.execute(
            f"SELECT DISTINCT mbid FROM library WHERE mbid IN ({placeholders})", mbids
        ) as cur:
            for row in await cur.fetchall():
                if row["mbid"]:
                    matched.add(row["mbid"])

    # 2. Exact MBID match in downloads table (status=complete + file exists)
    if mbids:
        unmatched_mbids = [m for m in mbids if m not in matched]
        if unmatched_mbids:
            placeholders = ",".join("?" * len(unmatched_mbids))
            async with db.execute(
                f"SELECT mbid, file_path FROM downloads WHERE mbid IN ({placeholders}) AND status='complete'",
                unmatched_mbids,
            ) as cur:
                import os
                for row in await cur.fetchall():
                    if row["mbid"] and row["file_path"] and os.path.exists(row["file_path"]):
                        matched.add(row["mbid"])

    # 3. Fuzzy artist+title match for remaining tracks (library entries without MBID)
    still_unmatched = [t for t in req.tracks if t.mbid not in matched]
    if still_unmatched:
        async with db.execute(
            "SELECT artist, title, mbid FROM library WHERE artist IS NOT NULL AND title IS NOT NULL"
        ) as cur:
            lib_rows = await cur.fetchall()

        lib_entries = [(r["artist"] or "", r["title"] or "", r["mbid"]) for r in lib_rows]

        for track in still_unmatched:
            query = f"{track.title} {track.artist}".lower()
            for lib_artist, lib_title, lib_mbid in lib_entries:
                candidate = f"{lib_title} {lib_artist}".lower()
                score = fuzz.token_sort_ratio(query, candidate)
                if score >= 85:
                    matched.add(track.mbid)
                    break

    return {"matched": list(matched)}
