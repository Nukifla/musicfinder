import asyncio
import os
import subprocess
from typing import Optional

from shazamio import Shazam


async def identify_audio(input_path: str) -> Optional[dict]:
    """Normalize an uploaded clip via ffmpeg (whatever container the browser's
    MediaRecorder produced — webm/opus, mp4/aac, etc. — ffmpeg auto-detects
    from content, no extension needed) and run it through Shazam. Returns
    {"title", "artist", "cover_art_url"} or None if nothing matched."""
    wav_path = f"{input_path}.wav"

    def _convert() -> bool:
        result = subprocess.run(
            ["ffmpeg", "-y", "-i", input_path, "-ar", "44100", "-ac", "1", wav_path],
            capture_output=True,
        )
        return result.returncode == 0

    if not await asyncio.to_thread(_convert):
        return None

    try:
        shazam = Shazam()
        result = await shazam.recognize(wav_path)
    except Exception:
        return None
    finally:
        if os.path.exists(wav_path):
            os.remove(wav_path)

    track = result.get("track")
    if not track:
        return None

    images = track.get("images") or {}
    cover_art_url = images.get("coverarthq") or images.get("coverart")

    return {
        "title": track.get("title", ""),
        "artist": track.get("subtitle", ""),
        "cover_art_url": cover_art_url,
    }
