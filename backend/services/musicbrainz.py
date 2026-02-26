import asyncio
from typing import Optional
import musicbrainzngs as mb
from config import settings
from models import SearchResult

mb.set_useragent(
    settings.mb_useragent_app,
    settings.mb_useragent_version,
    settings.mb_useragent_email,
)

import httpx

CAA_BASE = "https://coverartarchive.org/release"
CAA_RG_BASE = "https://coverartarchive.org/release-group"


async def _fetch_cover_art_url(release_mbid: str, client: httpx.AsyncClient) -> Optional[str]:
    """Return thumbnail URL if cover art exists, else None."""
    try:
        url = f"{CAA_BASE}/{release_mbid}/front-250"
        r = await client.head(url, timeout=2.0, follow_redirects=True)
        if r.status_code == 200:
            return str(r.url)
        return None
    except Exception:
        return None


async def _fetch_rg_cover_art_url(rg_mbid: str, client: httpx.AsyncClient) -> Optional[str]:
    """Return release-group thumbnail URL if cover art exists, else None."""
    try:
        url = f"{CAA_RG_BASE}/{rg_mbid}/front-250"
        r = await client.head(url, timeout=2.0, follow_redirects=True)
        if r.status_code == 200:
            return str(r.url)
        return None
    except Exception:
        return None


def _parse_recording(rec: dict) -> dict:
    artist = ""
    artist_mbid = None
    if rec.get("artist-credit"):
        ac = rec["artist-credit"][0]
        if isinstance(ac, dict) and "artist" in ac:
            artist = ac["artist"].get("name", "")
            artist_mbid = ac["artist"].get("id")

    release_mbid = None
    album = None
    track_number = None
    year = None

    releases = rec.get("release-list", [])
    if releases:
        rel = releases[0]
        release_mbid = rel.get("id")
        album = rel.get("title")
        date = rel.get("date", "")
        if date:
            year = int(date[:4]) if date[:4].isdigit() else None
        # track number
        medium_list = rel.get("medium-list", [])
        if medium_list:
            track_list = medium_list[0].get("track-list", [])
            if track_list:
                pos = track_list[0].get("position") or track_list[0].get("number")
                try:
                    track_number = int(pos)
                except (TypeError, ValueError):
                    pass

    duration_ms = None
    if rec.get("length"):
        try:
            duration_ms = int(rec["length"])
        except (ValueError, TypeError):
            pass

    return {
        "mbid": rec["id"],
        "title": rec.get("title", ""),
        "artist": artist,
        "artist_mbid": artist_mbid,
        "album": album,
        "release_mbid": release_mbid,
        "track_number": track_number,
        "duration_ms": duration_ms,
        "year": year,
        "score": int(rec.get("ext:score", 0)),
    }


async def search_recordings(query: str, limit: int = 25) -> list[SearchResult]:
    def _search():
        return mb.search_recordings(query, limit=limit)

    try:
        result = await asyncio.to_thread(_search)
    except mb.WebServiceError:
        return []

    recordings = result.get("recording-list", [])
    parsed = [_parse_recording(r) for r in recordings]

    # Fetch cover art for top results with a release_mbid
    top_with_release = [p for p in parsed[:10] if p["release_mbid"]]
    async with httpx.AsyncClient() as client:
        tasks = [_fetch_cover_art_url(p["release_mbid"], client) for p in top_with_release]
        covers = await asyncio.gather(*tasks, return_exceptions=True)

    cover_map: dict[str, Optional[str]] = {}
    for p, cover in zip(top_with_release, covers):
        cover_map[p["release_mbid"]] = cover if not isinstance(cover, Exception) else None

    results = []
    for p in parsed:
        cover_art_url = cover_map.get(p.get("release_mbid"), None)
        results.append(SearchResult(cover_art_url=cover_art_url, **p))

    return results


async def get_recording_full(mbid: str) -> Optional[dict]:
    def _lookup():
        return mb.get_recording_by_id(
            mbid,
            includes=["artists", "releases", "tags"],
        )

    try:
        result = await asyncio.to_thread(_lookup)
        return result.get("recording")
    except mb.WebServiceError:
        return None


async def get_release_full(release_mbid: str) -> Optional[dict]:
    def _lookup():
        return mb.get_release_by_id(
            release_mbid,
            includes=["artists", "recordings", "labels"],
        )

    try:
        result = await asyncio.to_thread(_lookup)
        return result.get("release")
    except mb.WebServiceError:
        return None


async def search_artists(query: str, limit: int = 5) -> list[dict]:
    def _search():
        return mb.search_artists(query, limit=limit)

    try:
        result = await asyncio.to_thread(_search)
    except mb.WebServiceError:
        return []

    artists = result.get("artist-list", [])
    return [
        {
            "mbid": a["id"],
            "name": a.get("name", ""),
            "disambiguation": a.get("disambiguation"),
            "score": int(a.get("ext:score", 0)),
        }
        for a in artists
    ]


async def search_release_groups(query: str, limit: int = 8) -> list[dict]:
    def _search():
        return mb.search_release_groups(query, limit=limit)

    try:
        result = await asyncio.to_thread(_search)
    except mb.WebServiceError:
        return []

    rgroups = result.get("release-group-list", [])

    parsed = []
    for rg in rgroups:
        artist = rg.get("artist-credit-phrase", "")
        artist_mbid = None
        ac = rg.get("artist-credit", [])
        if ac and isinstance(ac[0], dict) and "artist" in ac[0]:
            artist_mbid = ac[0]["artist"].get("id")

        date = rg.get("first-release-date", "")
        year = None
        if date and date[:4].isdigit():
            year = int(date[:4])

        parsed.append({
            "mbid": rg["id"],
            "title": rg.get("title", ""),
            "artist": artist,
            "artist_mbid": artist_mbid,
            "type": rg.get("primary-type", "Other"),
            "year": year,
            "score": int(rg.get("ext:score", 0)),
            "cover_art_url": f"{CAA_RG_BASE}/{rg['id']}/front-250",
        })

    return parsed


def _date_to_int(date_str: str) -> int:
    if not date_str:
        return 99991231
    parts = date_str.split("-")
    year = int(parts[0]) if parts[0].isdigit() else 9999
    month = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 12
    day = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else 31
    return year * 10000 + month * 100 + day


async def get_artist_release_groups(artist_mbid: str) -> dict:
    def _lookup():
        return mb.get_artist_by_id(artist_mbid, includes=["release-groups"])

    try:
        result = await asyncio.to_thread(_lookup)
    except mb.WebServiceError:
        return {}

    artist = result.get("artist", {})
    rg_list = artist.get("release-group-list", [])

    # Sort by date ascending
    rg_list_sorted = sorted(rg_list, key=lambda r: _date_to_int(r.get("first-release-date", "")))

    parsed = []
    for rg in rg_list_sorted:
        date = rg.get("first-release-date", "")
        year = int(date[:4]) if date and date[:4].isdigit() else None
        parsed.append({
            "mbid": rg["id"],
            "title": rg.get("title", ""),
            "release_type": rg.get("primary-type", "Other"),
            "year": year,
            "cover_art_url": f"{CAA_RG_BASE}/{rg['id']}/front-250",
        })

    return {
        "mbid": artist.get("id", artist_mbid),
        "name": artist.get("name", ""),
        "disambiguation": artist.get("disambiguation"),
        "release_groups": parsed,
    }


async def get_release_group_tracklist(rg_mbid: str) -> dict:
    # Step 1: browse releases in the release group to pick the best one
    def _browse():
        return mb.browse_releases(release_group=rg_mbid, includes=["media"])

    try:
        browse_result = await asyncio.to_thread(_browse)
    except mb.WebServiceError:
        return {}

    releases = browse_result.get("release-list", [])
    if not releases:
        return {}

    def _score_release(rel: dict):
        official = 1 if rel.get("status") == "Official" else 0
        track_count = sum(int(m.get("track-count", 0)) for m in rel.get("medium-list", []))
        date_key = -_date_to_int(rel.get("date", ""))
        return (official, track_count, date_key)

    best = max(releases, key=_score_release)
    release_mbid = best["id"]

    # Step 2: get full tracklist for the chosen release
    def _get_release():
        return mb.get_release_by_id(release_mbid, includes=["recordings", "artist-credits"])

    try:
        rel_result = await asyncio.to_thread(_get_release)
    except mb.WebServiceError:
        return {}

    release = rel_result.get("release", {})

    # Parse artist
    artist = ""
    artist_mbid_val = None
    ac = release.get("artist-credit", [])
    if ac and isinstance(ac[0], dict) and "artist" in ac[0]:
        artist = ac[0]["artist"].get("name", "")
        artist_mbid_val = ac[0]["artist"].get("id")

    # Parse date
    date = release.get("date", "")
    year = int(date[:4]) if date and date[:4].isdigit() else None

    # Parse tracks
    tracks = []
    for medium in release.get("medium-list", []):
        for track in medium.get("track-list", []):
            recording = track.get("recording", {})
            pos = track.get("position") or track.get("number")
            try:
                position = int(pos)
            except (TypeError, ValueError):
                position = 0

            duration_ms = None
            length = recording.get("length") or track.get("length")
            if length:
                try:
                    duration_ms = int(length)
                except (ValueError, TypeError):
                    pass

            tracks.append({
                "mbid": recording.get("id", ""),
                "title": recording.get("title") or track.get("title", ""),
                "position": position,
                "duration_ms": duration_ms,
            })

    return {
        "release_mbid": release_mbid,
        "cover_art_url": f"{CAA_BASE}/{release_mbid}/front-250",
        "rg_mbid": rg_mbid,
        "title": release.get("title", ""),
        "artist": artist,
        "artist_mbid": artist_mbid_val,
        "year": year,
        "tracks": tracks,
    }
