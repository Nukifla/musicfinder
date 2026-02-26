import asyncio
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from services.job_manager import job_manager

router = APIRouter(prefix="/api/progress", tags=["progress"])


def _sse_format(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


@router.get("/all")
async def progress_all():
    async def event_gen():
        async for event in job_manager.subscribe_all():
            yield _sse_format(event)

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{job_id}")
async def progress_stream(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_gen():
        async for event in job_manager.subscribe(job_id):
            yield _sse_format(event)

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
