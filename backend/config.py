from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Paths
    music_dir: str = "/music"
    db_path: str = "/app/data/db/musicfinder.db"
    cookies_path: str = "/app/cookies/cookies.txt"
    tmp_dir: str = "/tmp/musicfinder"

    # MusicBrainz
    mb_useragent_app: str = "MusicFinder"
    mb_useragent_version: str = "1.0"
    mb_useragent_email: str = "musicfinder@localhost"

    # Download
    path_template: str = "{artist}/{album}/{track} {title}"
    default_format: str = "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio"

    # App
    app_host: str = "0.0.0.0"
    app_port: int = 8000


settings = Settings()
