from pydantic import BaseModel
from typing import Optional


class UnifiedResult(BaseModel):
    type: str  # "artist" | "release_group" | "recording"
    mbid: str
    name: str  # artist name, album title, or track title
    score: int
    disambiguation: Optional[str] = None
    artist: Optional[str] = None
    artist_mbid: Optional[str] = None
    release_type: Optional[str] = None
    year: Optional[int] = None
    cover_art_url: Optional[str] = None
    album: Optional[str] = None
    release_mbid: Optional[str] = None
    track_number: Optional[int] = None
    duration_ms: Optional[int] = None


class TrackSummary(BaseModel):
    mbid: str
    title: str
    position: int
    duration_ms: Optional[int] = None


class ArtistReleaseGroup(BaseModel):
    mbid: str
    title: str
    release_type: str
    year: Optional[int] = None
    cover_art_url: Optional[str] = None


class ArtistDetail(BaseModel):
    mbid: str
    name: str
    disambiguation: Optional[str] = None
    image_url: Optional[str] = None
    release_groups: list[ArtistReleaseGroup]


class ReleaseGroupDetail(BaseModel):
    release_mbid: str
    rg_mbid: str
    title: str
    artist: str
    artist_mbid: Optional[str] = None
    year: Optional[int] = None
    cover_art_url: Optional[str] = None
    tracks: list[TrackSummary]


class DownloadRecord(BaseModel):
    id: int
    job_id: str
    mbid: Optional[str]
    release_mbid: Optional[str]
    title: str
    artist: str
    album: Optional[str]
    track_number: Optional[int]
    duration_ms: Optional[int]
    year: Optional[int]
    status: str
    file_path: Optional[str]
    file_format: Optional[str]
    file_size: Optional[int]
    youtube_url: Optional[str]
    error_msg: Optional[str]
    created_at: str
    completed_at: Optional[str]


class SearchResult(BaseModel):
    mbid: str
    title: str
    artist: str
    artist_mbid: Optional[str]
    album: Optional[str]
    release_mbid: Optional[str]
    track_number: Optional[int]
    duration_ms: Optional[int]
    year: Optional[int]
    score: int
    cover_art_url: Optional[str]


class DownloadRequest(BaseModel):
    mbid: str
    release_mbid: Optional[str] = None


class DownloadResponse(BaseModel):
    job_id: str
    title: str
    artist: str
    album: Optional[str]


class SettingsModel(BaseModel):
    path_template: str
    default_format: str
    search_artist_images: bool = False


class CookieStatus(BaseModel):
    present: bool
    size_bytes: Optional[int]
    valid: bool
