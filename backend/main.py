import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from config import settings
from database import get_db, close_db
from services.job_manager import job_manager
from routers import search, downloads, progress, cookies, settings as settings_router


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

# Serve React build — mount LAST so it catches all non-API routes
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
