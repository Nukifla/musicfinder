import io
import os
from pathlib import Path
from typing import Optional

import httpx
import mutagen
from mutagen.flac import FLAC, Picture
from mutagen.id3 import (
    APIC,
    ID3,
    ID3NoHeaderError,
    TALB,
    TDRC,
    TIT2,
    TPE1,
    TRCK,
)
from mutagen.mp4 import MP4, MP4Cover
from mutagen.oggvorbis import OggVorbis
from mutagen.oggopus import OggOpus

CAA_BASE = "https://coverartarchive.org/release"


async def _fetch_cover(release_mbid: Optional[str]) -> Optional[bytes]:
    if not release_mbid:
        return None
    try:
        url = f"{CAA_BASE}/{release_mbid}/front"
        async with httpx.AsyncClient(follow_redirects=True) as client:
            r = await client.get(url, timeout=10.0)
            if r.status_code == 200:
                return r.content
    except Exception:
        pass
    return None


def _detect_format(path: str) -> str:
    ext = Path(path).suffix.lower()
    return ext.lstrip(".")


async def tag_file(
    path: str,
    title: str,
    artist: str,
    album: Optional[str],
    track_number: Optional[int],
    year: Optional[int],
    release_mbid: Optional[str],
) -> None:
    cover_data = await _fetch_cover(release_mbid)
    fmt = _detect_format(path)

    if fmt in ("webm", "ogg", "opus"):
        _tag_vorbis(path, title, artist, album, track_number, year, cover_data, fmt)
    elif fmt in ("mp3",):
        _tag_mp3(path, title, artist, album, track_number, year, cover_data)
    elif fmt in ("m4a", "mp4", "aac"):
        _tag_mp4(path, title, artist, album, track_number, year, cover_data)
    elif fmt == "flac":
        _tag_flac(path, title, artist, album, track_number, year, cover_data)


def _tag_vorbis(path, title, artist, album, track_number, year, cover_data, fmt):
    try:
        if fmt == "opus":
            audio = OggOpus(path)
        else:
            try:
                audio = OggVorbis(path)
            except Exception:
                audio = mutagen.File(path, easy=True)
    except Exception:
        audio = mutagen.File(path, easy=True)

    if audio is None:
        return

    if title:
        audio["title"] = [title]
    if artist:
        audio["artist"] = [artist]
    if album:
        audio["album"] = [album]
    if track_number:
        audio["tracknumber"] = [str(track_number)]
    if year:
        audio["date"] = [str(year)]

    if cover_data:
        pic = Picture()
        pic.type = 3
        pic.mime = "image/jpeg"
        pic.data = cover_data
        import base64
        audio["metadata_block_picture"] = [
            base64.b64encode(pic.write()).decode("ascii")
        ]

    audio.save()


def _tag_mp3(path, title, artist, album, track_number, year, cover_data):
    try:
        audio = ID3(path)
    except ID3NoHeaderError:
        audio = ID3()

    if title:
        audio["TIT2"] = TIT2(encoding=3, text=title)
    if artist:
        audio["TPE1"] = TPE1(encoding=3, text=artist)
    if album:
        audio["TALB"] = TALB(encoding=3, text=album)
    if track_number:
        audio["TRCK"] = TRCK(encoding=3, text=str(track_number))
    if year:
        audio["TDRC"] = TDRC(encoding=3, text=str(year))
    if cover_data:
        audio["APIC"] = APIC(
            encoding=3,
            mime="image/jpeg",
            type=3,
            desc="Cover",
            data=cover_data,
        )
    audio.save(path)


def _tag_mp4(path, title, artist, album, track_number, year, cover_data):
    audio = MP4(path)
    tags = audio.tags
    if tags is None:
        audio.add_tags()
        tags = audio.tags

    if title:
        tags["\xa9nam"] = [title]
    if artist:
        tags["\xa9ART"] = [artist]
    if album:
        tags["\xa9alb"] = [album]
    if track_number:
        tags["trkn"] = [(track_number, 0)]
    if year:
        tags["\xa9day"] = [str(year)]
    if cover_data:
        tags["covr"] = [MP4Cover(cover_data, imageformat=MP4Cover.FORMAT_JPEG)]

    audio.save()


def _tag_flac(path, title, artist, album, track_number, year, cover_data):
    audio = FLAC(path)
    if title:
        audio["title"] = [title]
    if artist:
        audio["artist"] = [artist]
    if album:
        audio["album"] = [album]
    if track_number:
        audio["tracknumber"] = [str(track_number)]
    if year:
        audio["date"] = [str(year)]
    if cover_data:
        pic = Picture()
        pic.type = 3
        pic.mime = "image/jpeg"
        pic.data = cover_data
        audio.add_picture(pic)
    audio.save()
