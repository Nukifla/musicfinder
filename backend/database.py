import aiosqlite
from config import settings

_db: aiosqlite.Connection | None = None


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        _db = await aiosqlite.connect(settings.db_path)
        _db.row_factory = aiosqlite.Row
        await _db.execute("PRAGMA journal_mode=WAL")
        await _db.execute("PRAGMA synchronous=NORMAL")
        await _db.execute("PRAGMA foreign_keys=ON")
        await init_schema(_db)
    return _db


async def init_schema(db: aiosqlite.Connection) -> None:
    await db.executescript("""
        CREATE TABLE IF NOT EXISTS downloads (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id      TEXT    NOT NULL UNIQUE,
            mbid        TEXT,
            release_mbid TEXT,
            title       TEXT    NOT NULL,
            artist      TEXT    NOT NULL,
            album       TEXT,
            track_number INTEGER,
            duration_ms INTEGER,
            year        INTEGER,
            status      TEXT    NOT NULL DEFAULT 'pending',
            file_path   TEXT,
            file_format TEXT,
            file_size   INTEGER,
            youtube_url TEXT,
            error_msg   TEXT,
            created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
            completed_at TEXT
        );

        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        INSERT OR IGNORE INTO settings (key, value) VALUES
            ('path_template',  '{artist}/{album}/{track} {title}'),
            ('default_format', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio');
    """)
    await db.commit()


async def close_db() -> None:
    global _db
    if _db is not None:
        await _db.close()
        _db = None
