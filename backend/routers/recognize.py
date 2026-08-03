import os
import uuid

from fastapi import APIRouter, File, UploadFile

from config import settings
from models import RecognizeMatch, RecognizeResponse, UnifiedResult
from services.musicbrainz import (
    build_exact_recording_query,
    build_exact_release_group_query,
    search_artists,
    search_recordings,
    search_release_groups,
)
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

    artist_result = None
    if match["artist"]:
        artists = await search_artists(match["artist"], limit=1)
        if artists:
            a = artists[0]
            artist_result = UnifiedResult(
                type="artist", mbid=a["mbid"], name=a["name"], score=a["score"],
                disambiguation=a.get("disambiguation"), cover_art_url=a.get("image_url"),
            )

    release_group_result = None
    if match.get("album") and match["artist"]:
        rg_query = build_exact_release_group_query(match["album"], match["artist"])
        rgroups = await search_release_groups(rg_query, limit=1)
        if rgroups:
            rg = rgroups[0]
            release_group_result = UnifiedResult(
                type="release_group", mbid=rg["mbid"], name=rg["title"], score=rg["score"],
                artist=rg.get("artist"), artist_mbid=rg.get("artist_mbid"),
                release_type=rg.get("type"), year=rg.get("year"), cover_art_url=rg.get("cover_art_url"),
            )

    return RecognizeResponse(
        match=RecognizeMatch(
            title=match["title"], artist=match["artist"], album=match.get("album"),
            cover_art_url=match["cover_art_url"],
        ),
        artist=artist_result,
        release_group=release_group_result,
        results=results,
    )
