"""PanDrop FastAPI app — CORS, StaticFiles, routes. Backend only."""
from __future__ import annotations

import logging

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.schemas import HealthResponse, JobResponse
from app.services import pipeline_service

logging.basicConfig(level=logging.INFO)
settings.jobs_path.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="PanDrop API",
    description="Point, Talk, Sell — AI video-to-showcase e-commerce engine (backend only).",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(settings.static_path)), name="static")


@app.get("/health", response_model=HealthResponse, tags=["system"])
@app.get("/api/v1/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    return HealthResponse(mock_ai=settings.mock_enabled)


async def _handle_upload(file: UploadFile) -> JobResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing video filename")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty upload")
    try:
        return await pipeline_service.process_video(data, file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/v1/process-video", response_model=JobResponse, tags=["jobs"])
async def process_video(file: UploadFile = File(...)) -> JobResponse:
    return await _handle_upload(file)


@app.post("/api/v1/jobs", response_model=JobResponse, tags=["jobs"])
async def create_job(file: UploadFile = File(...)) -> JobResponse:
    return await _handle_upload(file)


@app.get("/api/v1/jobs/{job_id}", response_model=JobResponse, tags=["jobs"])
async def get_job(job_id: str) -> JobResponse:
    result = pipeline_service.load_job_result(job_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")
    return result
