import asyncio
import os
import re
from datetime import datetime, timezone
from pathlib import Path

import mutagen
import mutagen.mp3
import mutagen.flac
import mutagen.mp4
import mutagen.oggvorbis
import mutagen.oggopus

AUDIO_EXTENSIONS = {".mp3", ".flac", ".opus", ".ogg", ".m4a", ".aac", ".wav"}
_TRACK_PREFIX = re.compile(r"^\d+\s+")

_scanning = False


def is_scanning() -> bool:
    return _scanning


def _read_tags(path: Path) -> dict:
    """Return dict with keys: mbid, artist, album, title (all nullable)."""
    result = {"mbid": None, "artist": None, "album": None, "title": None}
    try:
        f = mutagen.File(path, easy=True)
        if f is None:
            return result
        def _get(key):
            v = f.get(key)
            return v[0] if v else None

        result["artist"] = _get("artist") or _get("albumartist")
        result["album"] = _get("album")
        result["title"] = _get("title")

        # MBID — try easy tag first, then raw
        mbid = _get("musicbrainz_trackid")
        if not mbid:
            raw = mutagen.File(path)
            if raw:
                # MP3 TXXX frames
                for key in (raw.tags or {}):
                    k = str(key)
                    if "musicbrainz track id" in k.lower() or "musicbrainz_trackid" in k.lower():
                        v = raw.tags[key]
                        mbid = v.text[0] if hasattr(v, "text") else str(v)
                        break
                # M4A freeform atom
                if not mbid:
                    atom_key = "----:com.apple.iTunes:MusicBrainz Track Id"
                    if atom_key in (raw.tags or {}):
                        raw_bytes = raw.tags[atom_key]
                        if raw_bytes:
                            mbid = bytes(raw_bytes[0]).decode("utf-8", errors="ignore")
        result["mbid"] = mbid or None
    except Exception:
        pass
    return result


def _folder_fallback(path: Path, music_dir: Path) -> dict:
    """Derive artist/album/title from folder structure."""
    try:
        rel = path.relative_to(music_dir)
        parts = rel.parts
        result = {"artist": None, "album": None, "title": None}
        if len(parts) >= 3:
            result["artist"] = parts[-3]
            result["album"] = parts[-2]
        elif len(parts) == 2:
            result["artist"] = parts[-2]
        stem = path.stem
        result["title"] = _TRACK_PREFIX.sub("", stem).strip() or stem
        return result
    except Exception:
        return {"artist": None, "album": None, "title": None}


async def scan_library(music_dir: str, db) -> dict:
    global _scanning
    if _scanning:
        return {"status": "already_running"}
    _scanning = True
    try:
        rows = await asyncio.to_thread(_collect_files, music_dir)
        await _write_rows(db, rows)
        return {"file_count": len(rows)}
    finally:
        _scanning = False


def _collect_files(music_dir: str) -> list:
    """Blocking file walk + tag reads — no asyncio."""
    music_path = Path(music_dir)
    rows = []
    for root, _, files in os.walk(music_path):
        for fname in files:
            fp = Path(root) / fname
            if fp.suffix.lower() not in AUDIO_EXTENSIONS:
                continue
            tags = _read_tags(fp)
            folder = _folder_fallback(fp, music_path)
            rows.append({
                "file_path": str(fp),
                "artist": tags["artist"] or folder["artist"],
                "album": tags["album"] or folder["album"],
                "title": tags["title"] or folder["title"],
                "mbid": tags["mbid"],
            })
    return rows


async def _write_rows(db, rows: list) -> None:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    await db.executemany(
        """INSERT INTO library (file_path, artist, album, title, mbid, scanned_at)
           VALUES (:file_path, :artist, :album, :title, :mbid, :scanned_at)
           ON CONFLICT(file_path) DO UPDATE SET
               artist=excluded.artist, album=excluded.album,
               title=excluded.title, mbid=excluded.mbid,
               scanned_at=excluded.scanned_at""",
        [{**r, "scanned_at": now} for r in rows],
    )
    # Remove entries whose files no longer exist
    await db.execute(
        "DELETE FROM library WHERE file_path NOT IN ({})".format(
            ",".join("?" * len(rows))
        ) if rows else "DELETE FROM library WHERE 1=0",
        [r["file_path"] for r in rows] if rows else [],
    )
    await db.execute(
        "INSERT OR REPLACE INTO library_meta (key, value) VALUES ('last_scan', ?)",
        (now,),
    )
    await db.execute(
        "INSERT OR REPLACE INTO library_meta (key, value) VALUES ('file_count', ?)",
        (str(len(rows)),),
    )
    await db.commit()
