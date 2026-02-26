import asyncio
import time
from typing import Optional
from urllib.parse import quote as urlquote, unquote as urlunquote
import musicbrainzngs as mb
from config import settings
from models import SearchResult

# Simple in-memory TTL cache for MB search results
_cache: dict[str, tuple[float, object]] = {}
_CACHE_TTL = 300  # 5 minutes


def _cache_get(key: str) -> Optional[object]:
    entry = _cache.get(key)
    if entry and time.monotonic() - entry[0] < _CACHE_TTL:
        return entry[1]
    return None


def _cache_set(key: str, value: object) -> None:
    _cache[key] = (time.monotonic(), value)

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


_WIKIMEDIA_UA = {"User-Agent": "musicfinder/0.1 (https://github.com/Nukifla/musicfinder)"}


async def _wikimedia_thumburl(filename: str, client: httpx.AsyncClient) -> Optional[str]:
    """Resolve a Wikimedia Commons filename to a direct CDN thumbnail URL."""
    cache_key = f"commons_thumb:{filename}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached  # type: ignore[return-value]
    try:
        api_url = (
            "https://commons.wikimedia.org/w/api.php"
            f"?action=query&titles=File:{urlquote(filename)}"
            "&prop=imageinfo&iiprop=url&iiurlwidth=300&format=json"
        )
        r = await client.get(api_url, timeout=4.0, headers=_WIKIMEDIA_UA)
        if r.status_code == 200:
            pages = r.json().get("query", {}).get("pages", {})
            for page in pages.values():
                thumburl = (page.get("imageinfo") or [{}])[0].get("thumburl")
                if thumburl:
                    _cache_set(cache_key, thumburl)
                    return thumburl
    except Exception:
        pass
    _cache_set(cache_key, None)
    return None


async def _fetch_artist_image(url_rels: list[dict], client: httpx.AsyncClient) -> Optional[str]:
    """Try to find an artist image from MB URL relations."""
    filename: Optional[str] = None

    # Priority 1: direct Wikimedia Commons image link
    for rel in url_rels:
        if rel.get("type") == "image":
            target = rel.get("target", "")
            if "/File:" in target:
                filename = target.split("/File:", 1)[-1]
                break

    # Priority 2: Wikidata P18 (image) property
    if not filename:
        for rel in url_rels:
            if rel.get("type") == "wikidata":
                target = rel.get("target", "")
                qid = target.rstrip("/").split("/")[-1]
                if not qid.startswith("Q"):
                    continue
                wd_cache_key = f"wikidata_img:{qid}"
                cached = _cache_get(wd_cache_key)
                if cached is not None:
                    return cached  # type: ignore[return-value]
                try:
                    r = await client.get(
                        f"https://www.wikidata.org/w/api.php"
                        f"?action=wbgetclaims&entity={qid}&property=P18&format=json",
                        timeout=3.0, headers=_WIKIMEDIA_UA,
                    )
                    if r.status_code == 200:
                        claims = r.json().get("claims", {}).get("P18", [])
                        if claims:
                            filename = claims[0]["mainsnak"]["datavalue"]["value"]
                except Exception:
                    pass
                if not filename:
                    _cache_set(wd_cache_key, None)
                break  # only try first wikidata rel

    if not filename:
        return None

    return await _wikimedia_thumburl(filename, client)


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
    key = f"recordings:{query}:{limit}"
    cached = _cache_get(key)
    if cached is not None:
        return cached  # type: ignore[return-value]

    def _search():
        return mb.search_recordings(query, limit=limit)

    try:
        result = await asyncio.to_thread(_search)
    except mb.WebServiceError:
        return []

    recordings = result.get("recording-list", [])
    parsed = [_parse_recording(r) for r in recordings]

    results = []
    for p in parsed:
        release_mbid = p.get("release_mbid")
        cover_art_url = f"{CAA_BASE}/{release_mbid}/front-250" if release_mbid else None
        results.append(SearchResult(cover_art_url=cover_art_url, **p))

    _cache_set(key, results)
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


async def _fetch_artist_images_sparql(mbids: list[str]) -> dict[str, str]:
    """Single SPARQL + batch Wikimedia call to get image URLs for multiple artist MBIDs."""
    if not mbids:
        return {}
    values = " ".join(f'"{m}"' for m in mbids)
    query = (
        "SELECT ?mbid ?image WHERE {"
        f" VALUES ?mbid {{ {values} }}"
        " ?artist wdt:P434 ?mbid ."
        " ?artist wdt:P18 ?image . }"
    )
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                "https://query.wikidata.org/sparql",
                params={"query": query, "format": "json"},
                headers={**_WIKIMEDIA_UA, "Accept": "application/sparql-results+json"},
                timeout=5.0,
            )
            if r.status_code != 200:
                return {}

            bindings = r.json().get("results", {}).get("bindings", [])
            # Extract filename per mbid
            filename_by_mbid: dict[str, str] = {}
            for row in bindings:
                mbid = row.get("mbid", {}).get("value", "")
                image_val = row.get("image", {}).get("value", "")
                if "/Special:FilePath/" in image_val:
                    filename = urlunquote(image_val.split("/Special:FilePath/", 1)[-1])
                    filename_by_mbid[mbid] = filename

            if not filename_by_mbid:
                return {}

            # Batch Wikimedia Commons API for direct CDN thumbnail URLs
            titles = "|".join(f"File:{f}" for f in filename_by_mbid.values())
            r2 = await client.get(
                "https://commons.wikimedia.org/w/api.php",
                params={
                    "action": "query", "titles": titles,
                    "prop": "imageinfo", "iiprop": "url",
                    "iiurlwidth": "250", "format": "json",
                },
                headers=_WIKIMEDIA_UA,
                timeout=5.0,
            )
            if r2.status_code != 200:
                return {}

            pages = r2.json().get("query", {}).get("pages", {})
            thumb_by_filename: dict[str, str] = {}
            for page in pages.values():
                title = page.get("title", "")
                if title.startswith("File:"):
                    fname = title[5:]
                    ii = (page.get("imageinfo") or [{}])[0]
                    thumburl = ii.get("thumburl")
                    if thumburl:
                        thumb_by_filename[fname] = thumburl

            return {
                mbid: thumb_by_filename[fname]
                for mbid, fname in filename_by_mbid.items()
                if fname in thumb_by_filename
            }
    except Exception:
        return {}


async def search_artists(query: str, limit: int = 5) -> list[dict]:
    key = f"artists:{query}:{limit}"
    cached = _cache_get(key)
    if cached is not None:
        return cached  # type: ignore[return-value]

    def _search():
        return mb.search_artists(query, limit=limit)

    try:
        result = await asyncio.to_thread(_search)
    except mb.WebServiceError:
        return []

    artists = result.get("artist-list", [])
    out = [
        {
            "mbid": a["id"],
            "name": a.get("name", ""),
            "disambiguation": a.get("disambiguation"),
            "score": int(a.get("ext:score", 0)),
        }
        for a in artists
    ]

    image_map = await _fetch_artist_images_sparql([a["mbid"] for a in out])
    for a in out:
        a["image_url"] = image_map.get(a["mbid"])

    _cache_set(key, out)
    return out


async def search_release_groups(query: str, limit: int = 8) -> list[dict]:
    key = f"rgs:{query}:{limit}"
    cached = _cache_get(key)
    if cached is not None:
        return cached  # type: ignore[return-value]

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

    _cache_set(key, parsed)
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
    cache_key = f"artist:{artist_mbid}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached  # type: ignore[return-value]

    def _lookup():
        return mb.get_artist_by_id(artist_mbid, includes=["release-groups", "url-rels"])

    try:
        result = await asyncio.to_thread(_lookup)
    except mb.WebServiceError:
        return {}

    artist = result.get("artist", {})
    rg_list = artist.get("release-group-list", [])
    url_rels = artist.get("url-relation-list", [])

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

    async with httpx.AsyncClient() as client:
        image_url = await _fetch_artist_image(url_rels, client)

    out = {
        "mbid": artist.get("id", artist_mbid),
        "name": artist.get("name", ""),
        "disambiguation": artist.get("disambiguation"),
        "image_url": image_url,
        "release_groups": parsed,
    }
    _cache_set(cache_key, out)
    return out


async def get_release_group_tracklist(rg_mbid: str) -> dict:
    cache_key = f"rg_tracklist:{rg_mbid}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached  # type: ignore[return-value]

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

    out = {
        "release_mbid": release_mbid,
        "cover_art_url": f"{CAA_BASE}/{release_mbid}/front-250",
        "rg_mbid": rg_mbid,
        "title": release.get("title", ""),
        "artist": artist,
        "artist_mbid": artist_mbid_val,
        "year": year,
        "tracks": tracks,
    }
    _cache_set(cache_key, out)
    return out
