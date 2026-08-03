import asyncio
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Optional

SENTINEL = object()


@dataclass
class JobState:
    job_id: str
    title: str
    artist: str
    album: Optional[str]
    mbid: str = ""
    status: str = "pending"
    progress: int = 0
    stage: str = "pending"
    speed: Optional[str] = None
    eta: Optional[str] = None
    error: Optional[str] = None
    final_path: Optional[str] = None
    youtube_url: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    completed_at: Optional[float] = None
    queue: asyncio.Queue = field(default_factory=asyncio.Queue)

    def to_event(self) -> dict:
        return {
            "job_id": self.job_id,
            "mbid": self.mbid,
            "title": self.title,
            "artist": self.artist,
            "album": self.album,
            "status": self.status,
            "progress": self.progress,
            "stage": self.stage,
            "speed": self.speed,
            "eta": self.eta,
            "error": self.error,
            "final_path": self.final_path,
            "youtube_url": self.youtube_url,
            "created_at": self.created_at * 1000,
        }


class JobManager:
    def __init__(self) -> None:
        self._jobs: dict[str, JobState] = {}
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._gc_task: Optional[asyncio.Task] = None

    def set_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def start_gc(self) -> None:
        self._gc_task = asyncio.create_task(self._gc_loop())

    async def _gc_loop(self) -> None:
        while True:
            await asyncio.sleep(30)
            now = time.time()
            to_delete = [
                jid
                for jid, job in self._jobs.items()
                if job.completed_at and (now - job.completed_at) > 60
            ]
            for jid in to_delete:
                del self._jobs[jid]

    def create_job(
        self, title: str, artist: str, album: Optional[str] = None, mbid: str = ""
    ) -> str:
        job_id = str(uuid.uuid4())
        self._jobs[job_id] = JobState(
            job_id=job_id,
            title=title,
            artist=artist,
            album=album,
            mbid=mbid,
        )
        return job_id

    def get_job(self, job_id: str) -> Optional[JobState]:
        return self._jobs.get(job_id)

    def list_jobs(self) -> list[JobState]:
        return list(self._jobs.values())

    def emit(self, job_id: str, update: dict[str, Any]) -> None:
        """Thread-safe: can be called from sync yt-dlp thread."""
        job = self._jobs.get(job_id)
        if job is None:
            return
        for k, v in update.items():
            if hasattr(job, k):
                setattr(job, k, v)
        event = job.to_event()
        if self._loop and not self._loop.is_closed():
            self._loop.call_soon_threadsafe(job.queue.put_nowait, event)

    async def emit_async(self, job_id: str, update: dict[str, Any]) -> None:
        """Async version for use inside coroutines."""
        job = self._jobs.get(job_id)
        if job is None:
            return
        for k, v in update.items():
            if hasattr(job, k):
                setattr(job, k, v)
        await job.queue.put(job.to_event())

    async def subscribe(self, job_id: str):
        """Yield SSE events. Replays current state snapshot, then streams."""
        job = self._jobs.get(job_id)
        if job is None:
            return
        # Replay snapshot
        yield job.to_event()
        if job.status in ("complete", "error"):
            return
        # Stream new events
        while True:
            try:
                event = await asyncio.wait_for(job.queue.get(), timeout=25.0)
                yield event
                if event.get("status") in ("complete", "error"):
                    break
            except asyncio.TimeoutError:
                # Yield keepalive
                yield {"keepalive": True, "job_id": job_id}

    async def subscribe_all(self):
        """Multiplex all active job queues."""
        seen_jobs: set[str] = set()
        while True:
            current_jobs = set(self._jobs.keys())
            for jid in current_jobs - seen_jobs:
                seen_jobs.add(jid)
            # Collect one event from any job that has one
            got_any = False
            for jid in list(current_jobs):
                job = self._jobs.get(jid)
                if job and not job.queue.empty():
                    event = job.queue.get_nowait()
                    yield event
                    got_any = True
            if not got_any:
                await asyncio.sleep(0.1)
                yield {"keepalive": True}


job_manager = JobManager()
