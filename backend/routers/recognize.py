import os
import uuid

from fastapi import APIRouter, File, UploadFile

from config import settings
from models import RecognizeMatch, RecognizeResponse, UnifiedResult
from services.musicbrainz import build_exact_recording_query, search_recordings
from services.recognize import identify_audio

router = APIRouter(prefix="/api/recognize", tags=["recognize"])


@router.post("", response_model=RecognizeResponse)
async def recognize(file: UploadFile = File(...)):
    os.makedirs(settings.tmp_dir, exist_ok=True)
    tmp_path = os.path.join(settings.tmp_dir, f"listen-{uuid.uuid4().hex}")

    try:
        data = await file.read()
        with open(tmp_path, "wb") as f:
            f.write(data)
        match = await identify_audio(tmp_path)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    if not match:
        return RecognizeResponse(match=None, results=[])

    query = build_exact_recording_query(match["title"], match["artist"]) if match["title"] and match["artist"] else ""
    recordings = await search_recordings(query, limit=5) if query else []

    results = [
        UnifiedResult(
            type="recording", mbid=rec.mbid, name=rec.title, score=rec.score,
            artist=rec.artist, artist_mbid=rec.artist_mbid, album=rec.album,
            release_mbid=rec.release_mbid, track_number=rec.track_number,
            duration_ms=rec.duration_ms, year=rec.year, cover_art_url=rec.cover_art_url,
        )
        for rec in recordings
    ]

    return RecognizeResponse(
        match=RecognizeMatch(title=match["title"], artist=match["artist"], cover_art_url=match["cover_art_url"]),
        results=results,
    )
