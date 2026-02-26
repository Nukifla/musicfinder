import re
import os
from pathlib import Path
from typing import Optional


_UNSAFE = re.compile(r'[\\:*?"<>|/\x00-\x1f]')
_MULTI_SPACE = re.compile(r"\s+")
_DOTS_LEADING = re.compile(r"^\.+")


def sanitise_component(s: str) -> str:
    """Sanitise a single path component (no slashes allowed inside)."""
    s = _UNSAFE.sub("_", s)
    s = _MULTI_SPACE.sub(" ", s)
    s = _DOTS_LEADING.sub("_", s)
    s = s.strip()
    if not s:
        s = "_"
    return s[:255]


def build_path(
    base_dir: str,
    template: str,
    title: str,
    artist: str,
    album: Optional[str],
    track_number: Optional[int],
    year: Optional[int],
    ext: str,
) -> str:
    """Expand template and build absolute output path."""
    safe_title = sanitise_component(title)
    safe_artist = sanitise_component(artist or "Unknown Artist")
    safe_album = sanitise_component(album or "Unknown Album")
    # Pre-format track as zero-padded string so template can use {track} without
    # the :02d format spec (which would break when track_number is None).
    track_str = f"{track_number:02d}" if track_number else ""
    yr = year or 0

    try:
        rel = template.format(
            title=safe_title,
            artist=safe_artist,
            album=safe_album,
            track=track_str,
            year=yr,
        )
    except (KeyError, ValueError):
        rel = f"{safe_artist}/{safe_album}/{safe_title}"

    # Strip accidental leading/trailing spaces in components (e.g. " title" when track="")
    rel = "/".join(part.strip() for part in rel.replace("\\", "/").split("/"))

    # Sanitise each component individually (template may insert slashes)
    parts = rel.replace("\\", "/").split("/")
    safe_parts = [sanitise_component(p) for p in parts if p]
    if not safe_parts:
        safe_parts = [safe_title]

    ext_clean = ext.lstrip(".")
    filename = f"{safe_parts[-1]}.{ext_clean}"
    safe_parts[-1] = filename

    return os.path.join(base_dir, *safe_parts)
