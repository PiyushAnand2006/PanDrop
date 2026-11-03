"""Strict Pydantic request/response models (mirrors schema.py contract)."""
from __future__ import annotations

from pydantic import BaseModel, Field


class TranscriptSegment(BaseModel):
    start: float
    end: float
    text: str


class TranscriptResult(BaseModel):
    text: str = ""
    segments: list[TranscriptSegment] = Field(default_factory=list)
    duration_sec: float = 0.0
    language: str = "en"


class DetectedItemIntent(BaseModel):
    spoken_name: str
    asking_price: float = 0.0
    spoken_condition: str = ""
    timestamp_sec: float = 0.0
    category: str = "General"


class VisionAuditResult(BaseModel):
    best_frame_index: int = 0
    bounding_box: list[int] = Field(default_factory=lambda: [0, 0, 0, 0])
    point_coords: list[int] = Field(default_factory=lambda: [0, 0])
    ai_condition_score: float = 8.0
    ai_badge_text: str = "8.0/10"
    ai_visual_notes: str = ""


class ListingCopyResult(BaseModel):
    seo_title: str = ""
    description: str = ""
    tags: list[str] = Field(default_factory=list)


class PriceInfo(BaseModel):
    amount: float
    currency: str = "USD"
    formatted: str


class ConditionInfo(BaseModel):
    spoken_claim: str = ""
    ai_score: float
    ai_badge_text: str
    ai_visual_notes: str = ""


class ItemAssets(BaseModel):
    raw_frame_url: str
    sam_mask_overlay_url: str
    real_cutout_png_url: str
    studio_showcase_url: str
    showcase_with_pricetag_url: str


class ProcessedItem(BaseModel):
    item_id: str
    spoken_name: str
    seo_title: str
    category: str
    price: PriceInfo
    timestamp_sec: float
    condition: ConditionInfo
    description: str = ""
    tags: list[str] = Field(default_factory=list)
    bounding_box: list[int] = Field(default_factory=list)
    assets: ItemAssets
    is_published: bool = False
    published_listing_id: str | None = None


class JobResponse(BaseModel):
    job_id: str
    user_id: str = ""
    status: str
    video_url: str
    duration_sec: float
    transcript: str
    items: list[ProcessedItem] = Field(default_factory=list)
    created_at: str = ""


class UserAccount(BaseModel):
    user_id: str
    username: str
    display_name: str
    avatar_url: str = ""
    location: str = ""
    wallet_balance: float = 0.0
    created_at: str = ""


class CreateUserRequest(BaseModel):
    username: str
    display_name: str = ""
    location: str = ""


class MarketplaceListing(BaseModel):
    listing_id: str
    job_id: str
    item_id: str
    seller_id: str
    seller_name: str
    seller_username: str
    seller_avatar: str = ""
    seller_location: str = ""
    status: str = "active"
    buyer_id: str | None = None
    buyer_name: str | None = None
    sold_at: str | None = None
    spoken_name: str
    seo_title: str
    category: str
    price: PriceInfo
    timestamp_sec: float = 0.0
    video_url: str = ""
    condition: ConditionInfo
    description: str = ""
    bounding_box: list[int] = Field(default_factory=list)
    assets: ItemAssets
    created_at: str = ""


class PublishItemOverride(BaseModel):
    price: float | None = None
    seo_title: str | None = None


class PublishRequest(BaseModel):
    user_id: str
    job_id: str
    item_ids: list[str] | None = None
    overrides: dict[str, PublishItemOverride] = Field(default_factory=dict)


class BuyRequest(BaseModel):
    buyer_id: str


class UserDashboardResponse(BaseModel):
    user: UserAccount
    extraction_jobs: list[JobResponse] = Field(default_factory=list)
    active_listings: list[MarketplaceListing] = Field(default_factory=list)
    sold_listings: list[MarketplaceListing] = Field(default_factory=list)
    purchased_listings: list[MarketplaceListing] = Field(default_factory=list)


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "pandrop-backend"
    mock_ai: bool = True
    version: str = "1.0.0"


class ErrorResponse(BaseModel):
    detail: str
