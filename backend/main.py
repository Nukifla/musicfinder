import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from config import settings
from database import get_db, close_db
from services.job_manager import job_manager
from routers import search, downloads, progress, cookies, settings as settings_router
from routers import library as library_router
from services.library_scanner import scan_library


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure dirs exist
    os.makedirs(os.path.dirname(settings.db_path), exist_ok=True)
    os.makedirs(settings.tmp_dir, exist_ok=True)
    os.makedirs(settings.music_dir, exist_ok=True)

    # Init DB
    db = await get_db()

    # Set event loop on job_manager + start GC
    import asyncio
    job_manager.set_loop(asyncio.get_running_loop())
    job_manager.start_gc()

    # Library scan: run immediately then every 24 hours
    async def _library_scan_loop():
        while True:
            await scan_library(settings.music_dir, db)
            await asyncio.sleep(86400)

    asyncio.create_task(_library_scan_loop())

    yield

    await close_db()


app = FastAPI(title="MusicFinder", lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok"}


# Routers — must be registered BEFORE StaticFiles mount
app.include_router(search.router)
app.include_router(downloads.router)
app.include_router(progress.router)
app.include_router(cookies.router)
app.include_router(settings_router.router)
app.include_router(library_router.router)

# Serve React build
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(static_dir / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        return FileResponse(static_dir / "index.html")
