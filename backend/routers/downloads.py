import asyncio
import os
import shutil
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from models import DownloadRequest, DownloadResponse, DownloadRecord
from database import get_db
from config import settings
from services.job_manager import job_manager
from services.musicbrainz import get_recording_full, get_release_full
from services.youtube import find_best_match, download_audio
from services.tagger import tag_file
from services.path_builder import build_path

router = APIRouter(prefix="/api/downloads", tags=["downloads"])


@router.post("", response_model=DownloadResponse)
async def start_download(req: DownloadRequest, background_tasks: BackgroundTasks):
    # Quick lookup for title/artist to seed the job immediately
    recording = await get_recording_full(req.mbid)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found on MusicBrainz")

    title = recording.get("title", "Unknown")
    artist = ""
    if recording.get("artist-credit"):
        ac = recording["artist-credit"][0]
        if isinstance(ac, dict) and "artist" in ac:
            artist = ac["artist"].get("name", "")

    release_mbid = req.release_mbid
    album = None
    if not release_mbid:
        releases = recording.get("release-list", [])
        if releases:
            release_mbid = releases[0].get("id")
            album = releases[0].get("title")

    job_id = job_manager.create_job(title=title, artist=artist, album=album)
    loop = asyncio.get_running_loop()
    job_manager.set_loop(loop)

    background_tasks.add_task(
        _run_download,
        job_id=job_id,
        mbid=req.mbid,
        release_mbid=release_mbid,
        recording=recording,
        loop=loop,
    )

    return DownloadResponse(job_id=job_id, title=title, artist=artist, album=album)


async def _run_download(
    job_id: str,
    mbid: str,
    release_mbid: Optional[str],
    recording: dict,
    loop: asyncio.AbstractEventLoop,
) -> None:
    db = await get_db()

    title = recording.get("title", "Unknown")
    artist = ""
    artist_mbid = None
    if recording.get("artist-credit"):
        ac = recording["artist-credit"][0]
        if isinstance(ac, dict) and "artist" in ac:
            artist = ac["artist"].get("name", "")
            artist_mbid = ac["artist"].get("id")

    duration_ms = None
    if recording.get("length"):
        try:
            duration_ms = int(recording["length"])
        except (ValueError, TypeError):
            pass

    # Get release details
    album = None
    album_artist = artist  # falls back to the track's own credited artist
    track_number = None
    year = None

    if release_mbid:
        release = await get_release_full(release_mbid)
        if release:
            album = release.get("title")
            if release.get("artist-credit"):
                rac = release["artist-credit"][0]
                if isinstance(rac, dict) and "artist" in rac:
                    album_artist = rac["artist"].get("name", artist)
            date = release.get("date", "")
            if date:
                year = int(date[:4]) if date[:4].isdigit() else None
            # Track number
            medium_list = release.get("medium-list", [])
            if medium_list:
                track_list = medium_list[0].get("track-list", [])
                for t in track_list:
                    if t.get("recording", {}).get("id") == mbid:
                        pos = t.get("position") or t.get("number")
                        try:
                            track_number = int(pos)
                        except (TypeError, ValueError):
                            pass
                        break

    # Update job
    await job_manager.emit_async(job_id, {"album": album, "stage": "searching_youtube", "progress": 5, "status": "searching"})

    # Insert DB record
    await db.execute(
        """INSERT INTO downloads (job_id, mbid, release_mbid, title, artist, album, track_number,
           duration_ms, year, status) VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (job_id, mbid, release_mbid, title, artist, album, track_number, duration_ms, year, "searching"),
    )
    await db.commit()

    try:
        # Find YouTube match
        best = await find_best_match(title, artist, duration_ms)
        if not best:
            raise ValueError("No YouTube match found")

        yt_url = best.get("url") or best.get("webpage_url") or f"https://www.youtube.com/watch?v={best.get('id', '')}"
        await job_manager.emit_async(job_id, {"stage": "matched", "progress": 15, "status": "matched", "youtube_url": yt_url})

        # Fetch format setting
        async with db.execute("SELECT value FROM settings WHERE key='default_format'") as cur:
            row = await cur.fetchone()
        fmt_selector = row["value"] if row else settings.default_format

        # Download
        out_dir = os.path.join(settings.tmp_dir, job_id)
        download_result = await download_audio(job_id, yt_url, out_dir, fmt_selector, loop)
        if not download_result or not os.path.exists(download_result[0]):
            raise ValueError("Download failed — file not found")
        file_path, yt_track_number = download_result

        # MusicBrainz didn't have a track number for this recording — fall back to
        # whatever YouTube's music-attribution metadata provided, if anything.
        if track_number is None and yt_track_number is not None:
            track_number = yt_track_number

        await job_manager.emit_async(job_id, {"stage": "tagging", "progress": 92, "status": "tagging"})

        # Tag
        await tag_file(
            path=file_path,
            title=title,
            artist=artist,
            album_artist=album_artist,
            album=album,
            track_number=track_number,
            year=year,
            release_mbid=release_mbid,
        )

        # Move to final destination
        async with db.execute("SELECT value FROM settings WHERE key='path_template'") as cur:
            row = await cur.fetchone()
        path_template = row["value"] if row else settings.path_template

        ext = Path(file_path).suffix.lstrip(".")
        final_path = build_path(
            base_dir=settings.music_dir,
            template=path_template,
            title=title,
            artist=album_artist,
            album=album,
            track_number=track_number,
            year=year,
            ext=ext,
        )
        os.makedirs(os.path.dirname(final_path), exist_ok=True)
        shutil.move(file_path, final_path)

        # Cleanup tmp dir
        try:
            shutil.rmtree(out_dir, ignore_errors=True)
        except Exception:
            pass

        file_size = os.path.getsize(final_path) if os.path.exists(final_path) else None

        await db.execute(
            """UPDATE downloads SET status='complete', file_path=?, file_format=?, file_size=?,
               youtube_url=?, track_number=?, completed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE job_id=?""",
            (final_path, ext, file_size, yt_url, track_number, job_id),
        )
        await db.commit()

        await job_manager.emit_async(
            job_id,
            {"stage": "complete", "progress": 100, "status": "complete", "final_path": final_path},
        )

    except Exception as e:
        err = str(e)
        await db.execute(
            "UPDATE downloads SET status='error', error_msg=? WHERE job_id=?",
            (err, job_id),
        )
        await db.commit()
        await job_manager.emit_async(
            job_id,
            {"stage": "error", "progress": 0, "status": "error", "error": err},
        )


@router.get("", response_model=list[DownloadRecord])
async def list_downloads(limit: int = 50, offset: int = 0):
    db = await get_db()
    async with db.execute(
        "SELECT * FROM downloads ORDER BY created_at DESC LIMIT ? OFFSET ?",
        (limit, offset),
    ) as cur:
        rows = await cur.fetchall()
    return [DownloadRecord(**dict(r)) for r in rows]


@router.delete("/{download_id}")
async def delete_download(download_id: int):
    db = await get_db()
    await db.execute("DELETE FROM downloads WHERE id=?", (download_id,))
    await db.commit()
    return {"deleted": True}
