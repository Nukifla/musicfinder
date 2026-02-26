from fastapi import APIRouter, HTTPException, Query
from models import SearchResult, UnifiedResult, ArtistDetail, ReleaseGroupDetail
from services.musicbrainz import (
    search_recordings,
    search_artists,
    search_release_groups,
    get_recording_full,
    get_artist_release_groups,
    get_release_group_tracklist,
)

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("", response_model=list[UnifiedResult])
async def search(q: str = Query(..., min_length=1)):
    # Run sequentially to respect MB rate limit
    artists = await search_artists(q, limit=5)
    rgroups = await search_release_groups(q, limit=8)
    recordings = await search_recordings(q, limit=5)

    results: list[UnifiedResult] = []

    for a in artists:
        results.append(UnifiedResult(
            type="artist",
            mbid=a["mbid"],
            name=a["name"],
            score=a["score"],
            disambiguation=a.get("disambiguation"),
        ))

    for rg in rgroups:
        results.append(UnifiedResult(
            type="release_group",
            mbid=rg["mbid"],
            name=rg["title"],
            score=rg["score"],
            artist=rg.get("artist"),
            artist_mbid=rg.get("artist_mbid"),
            release_type=rg.get("type"),
            year=rg.get("year"),
            cover_art_url=rg.get("cover_art_url"),
        ))

    for rec in recordings:
        results.append(UnifiedResult(
            type="recording",
            mbid=rec.mbid,
            name=rec.title,
            score=rec.score,
            artist=rec.artist,
            artist_mbid=rec.artist_mbid,
            album=rec.album,
            release_mbid=rec.release_mbid,
            track_number=rec.track_number,
            duration_ms=rec.duration_ms,
            year=rec.year,
            cover_art_url=rec.cover_art_url,
        ))

    results.sort(key=lambda r: r.score, reverse=True)
    return results


@router.get("/artist/{mbid}", response_model=ArtistDetail)
async def artist_detail(mbid: str):
    data = await get_artist_release_groups(mbid)
    if not data:
        raise HTTPException(status_code=404, detail="Artist not found")
    return ArtistDetail(**data)


@router.get("/release-group/{mbid}", response_model=ReleaseGroupDetail)
async def release_group_detail(mbid: str):
    data = await get_release_group_tracklist(mbid)
    if not data:
        raise HTTPException(status_code=404, detail="Release group not found")
    return ReleaseGroupDetail(**data)


@router.get("/lookup/{mbid}")
async def lookup(mbid: str):
    recording = await get_recording_full(mbid)
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    return recording
