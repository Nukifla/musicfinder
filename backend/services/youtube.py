import asyncio
import os
import re
from pathlib import Path
from typing import Any, Optional

import yt_dlp
from rapidfuzz import fuzz

from config import settings
from services.job_manager import job_manager

_DEPRIORITISE = re.compile(r"\b(live|cover|remix|karaoke|tribute|instrumental)\b", re.I)
_PREFER_CHANNELS = re.compile(r"(auto.generated|VEVO|official)", re.I)


def _score_result(info: dict, title: str, artist: str, duration_ms: Optional[int]) -> float:
    yt_title = info.get("title", "")
    channel = info.get("channel", "") or info.get("uploader", "")
    yt_duration = info.get("duration")  # seconds

    # Fuzzy match on "artist - title"
    expected = f"{artist} {title}"
    score = fuzz.token_sort_ratio(expected.lower(), yt_title.lower()) / 100.0

    # Duration match ±10s
    if duration_ms and yt_duration:
        diff = abs((duration_ms / 1000) - yt_duration)
        if diff <= 10:
            score += 0.3
        elif diff <= 30:
            score += 0.1
        else:
            score -= 0.2

    # Prefer auto-generated / VEVO / artist channels
    if _PREFER_CHANNELS.search(channel):
        score += 0.2

    # Deprioritise live/cover/remix/karaoke
    if _DEPRIORITISE.search(yt_title):
        score -= 0.4

    return score


def _make_progress_hook(job_id: str, loop: asyncio.AbstractEventLoop):
    def hook(d: dict) -> None:
        if d["status"] == "downloading":
            pct = 0
            if d.get("total_bytes"):
                pct = int(d["downloaded_bytes"] / d["total_bytes"] * 75) + 15
            elif d.get("total_bytes_estimate"):
                pct = int(d["downloaded_bytes"] / d["total_bytes_estimate"] * 75) + 15

            speed = d.get("_speed_str", "").strip()
            eta = d.get("_eta_str", "").strip()
            job_manager.emit(
                job_id,
                {
                    "stage": "downloading",
                    "status": "downloading",
                    "progress": min(pct, 89),
                    "speed": speed or None,
                    "eta": eta or None,
                },
            )
        elif d["status"] == "finished":
            job_manager.emit(
                job_id,
                {
                    "stage": "download_done",
                    "status": "downloading",
                    "progress": 90,
                    "speed": None,
                    "eta": None,
                },
            )

    return hook


async def find_best_match(
    title: str,
    artist: str,
    duration_ms: Optional[int],
) -> Optional[dict]:
    query = f"{artist} {title}"

    def _search() -> list[dict]:
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": True,
            "default_search": "ytsearch5",
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            result = ydl.extract_info(f"ytsearch5:{query}", download=False)
            if result and "entries" in result:
                return [e for e in result["entries"] if e]
            return []

    try:
        entries = await asyncio.to_thread(_search)
    except Exception:
        return None

    if not entries:
        return None

    scored = sorted(entries, key=lambda e: _score_result(e, title, artist, duration_ms), reverse=True)
    best = scored[0]
    return best


async def download_audio(
    job_id: str,
    url: str,
    out_dir: str,
    format_selector: str,
    loop: asyncio.AbstractEventLoop,
) -> Optional[tuple[str, Optional[int]]]:
    """Download audio to out_dir. Returns (path, yt_track_number) — track_number is
    only populated when YouTube exposes music-attribution metadata for the video,
    e.g. label-uploaded official audio."""
    os.makedirs(out_dir, exist_ok=True)
    outtmpl = os.path.join(out_dir, "%(id)s.%(ext)s")

    cookie_file = settings.cookies_path
    cookies_opt: dict[str, Any] = {}
    if os.path.exists(cookie_file):
        cookies_opt["cookiefile"] = cookie_file

    # Some videos (age-restricted ones especially) only expose muxed
    # video+audio formats and no audio-only stream at all, which makes an
    # audio-only selector fail outright with "Requested format is not
    # available" even though a perfectly downloadable format exists. Always
    # fall back to `best` — FFmpegExtractAudio below still strips the audio
    # track out of a muxed download, just at the cost of some wasted
    # bandwidth on the video portion.
    full_format_selector = f"{format_selector}/best"

    ydl_opts: dict[str, Any] = {
        "format": full_format_selector,
        "outtmpl": outtmpl,
        "quiet": True,
        "no_warnings": True,
        "progress_hooks": [_make_progress_hook(job_id, loop)],
        # Remux audio to its native container (webm→opus, m4a→m4a) without transcoding.
        # This makes mutagen tagging reliable; quality is unchanged.
        "postprocessors": [{"key": "FFmpegExtractAudio", "preferredcodec": "best", "preferredquality": "0"}],
        **cookies_opt,
    }

    def _download() -> Optional[tuple[str, Optional[int]]]:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)

        yt_track_number = None
        if info:
            raw = info.get("track_number")
            try:
                yt_track_number = int(raw) if raw is not None else None
            except (TypeError, ValueError):
                yt_track_number = None

        # After FFmpegExtractAudio the extension changes; find the actual file.
        files = [
            f for f in os.listdir(out_dir)
            if not f.endswith(".part") and not f.endswith(".ytdl") and not f.endswith(".webm")
        ]
        if files:
            return os.path.join(out_dir, files[0]), yt_track_number
        # Fallback: any non-partial file
        all_files = [f for f in os.listdir(out_dir) if not f.endswith(".part")]
        if all_files:
            return os.path.join(out_dir, all_files[0]), yt_track_number
        return None

    # Let exceptions propagate — _run_download's own error handler already
    # records the message and emits it. Catching here and returning None
    # used to overwrite the specific yt-dlp error (e.g. an age-restriction
    # notice telling the user to add cookies) with a generic "file not
    # found" message once the caller re-raised on the falsy result.
    return await asyncio.to_thread(_download)
