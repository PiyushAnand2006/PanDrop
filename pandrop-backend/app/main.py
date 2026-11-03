"""PanDrop FastAPI app — accounts, extraction jobs & marketplace. Backend only."""
from __future__ import annotations

import logging

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.schemas import (
    BuyRequest,
    CreateUserRequest,
    HealthResponse,
    JobResponse,
    MarketplaceListing,
    PublishRequest,
    UserAccount,
    UserDashboardResponse,
)
from app.services import pipeline_service, store_service

logging.basicConfig(level=logging.INFO)
settings.jobs_path.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="PanDrop API",
    description="Point, Talk, Sell & Discover — unified AI marketplace backend.",
    version="2.0.0",
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


def _resolve_user_id(user_id: str) -> str:
    """Uploads without an account fall back to the first demo account."""
    if user_id:
        return user_id
    users = store_service.list_users()
    return users[0].user_id if users else ""


async def _handle_upload(file: UploadFile, user_id: str) -> JobResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing video filename")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty upload")
    try:
        return await pipeline_service.process_video(
            data, file.filename, _resolve_user_id(user_id or "")
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/v1/process-video", response_model=JobResponse, tags=["jobs"])
async def process_video(
    file: UploadFile = File(...), user_id: str = Form("")
) -> JobResponse:
    return await _handle_upload(file, user_id)


@app.post("/api/v1/jobs", response_model=JobResponse, tags=["jobs"])
async def create_job(
    file: UploadFile = File(...), user_id: str = Form("")
) -> JobResponse:
    return await _handle_upload(file, user_id)


@app.get("/api/v1/jobs/{job_id}", response_model=JobResponse, tags=["jobs"])
async def get_job(job_id: str) -> JobResponse:
    result = pipeline_service.load_job_result(job_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")
    return result


# ------------------------------------------------------------------ accounts
@app.get("/api/v1/users", response_model=list[UserAccount], tags=["accounts"])
async def list_users() -> list[UserAccount]:
    return store_service.list_users()


@app.post("/api/v1/users", response_model=UserAccount, tags=["accounts"])
async def create_user(body: CreateUserRequest) -> UserAccount:
    try:
        return store_service.create_user(body.username, body.display_name, body.location)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/v1/users/{user_id}", response_model=UserAccount, tags=["accounts"])
async def get_user(user_id: str) -> UserAccount:
    user = store_service.get_user(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail=f"User not found: {user_id}")
    return user


@app.get(
    "/api/v1/users/{user_id}/dashboard",
    response_model=UserDashboardResponse,
    tags=["accounts"],
)
async def get_dashboard(user_id: str) -> UserDashboardResponse:
    try:
        data = store_service.get_dashboard(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return UserDashboardResponse(
        user=UserAccount(**data["user"]),
        extraction_jobs=[JobResponse(**j) for j in data["extraction_jobs"]],
        active_listings=[MarketplaceListing(**r) for r in data["active_listings"]],
        sold_listings=[MarketplaceListing(**r) for r in data["sold_listings"]],
        purchased_listings=[MarketplaceListing(**r) for r in data["purchased_listings"]],
    )


# --------------------------------------------------------------- marketplace
@app.post(
    "/api/v1/marketplace/publish",
    response_model=list[MarketplaceListing],
    tags=["marketplace"],
)
async def publish_items(body: PublishRequest) -> list[MarketplaceListing]:
    try:
        return store_service.publish_items(
            body.user_id, body.job_id, body.item_ids,
            {k: v.model_dump(exclude_none=True) for k, v in body.overrides.items()},
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get(
    "/api/v1/marketplace/listings",
    response_model=list[MarketplaceListing],
    tags=["marketplace"],
)
async def list_listings(
    q: str = "",
    category: str = "",
    min_price: float | None = None,
    max_price: float | None = None,
    min_condition: float | None = None,
    status: str = "active",
) -> list[MarketplaceListing]:
    return store_service.list_listings(
        q=q, category=category, min_price=min_price,
        max_price=max_price, min_condition=min_condition, status=status,
    )


@app.get(
    "/api/v1/marketplace/{listing_id}",
    response_model=MarketplaceListing,
    tags=["marketplace"],
)
async def get_listing(listing_id: str) -> MarketplaceListing:
    listing = store_service.get_listing(listing_id)
    if listing is None:
        raise HTTPException(status_code=404, detail=f"Listing not found: {listing_id}")
    return listing


@app.post(
    "/api/v1/marketplace/{listing_id}/buy",
    response_model=MarketplaceListing,
    tags=["marketplace"],
)
async def buy_listing(listing_id: str, body: BuyRequest) -> MarketplaceListing:
    try:
        return store_service.buy_listing(listing_id, body.buyer_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
