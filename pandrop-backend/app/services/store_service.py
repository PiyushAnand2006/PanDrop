"""Persistent JSON store for unified accounts, extraction jobs, listings & orders.

Backed by ``data/marketplace_db.json`` (atomic writes + thread lock).
First load seeds demo accounts (Alex / Maya / Sam, $500 wallets) and two
initial listings with procedurally generated showcase assets so the
Discovery feed is never empty.
"""
from __future__ import annotations

import json
import logging
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

from app.config import settings
from app.schemas import (
    ConditionInfo,
    ItemAssets,
    JobResponse,
    MarketplaceListing,
    PriceInfo,
    UserAccount,
)
from app.utils.image_utils import format_price

logger = logging.getLogger(__name__)

_lock = threading.Lock()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def _blank_db() -> dict:
    return {"users": {}, "jobs": {}, "listings": {}, "orders": []}


def _load_db() -> dict:
    path = settings.db_path
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            for key in ("users", "jobs", "listings", "orders"):
                data.setdefault(key, {} if key != "orders" else [])
            return data
        except Exception as exc:  # noqa: BLE001
            logger.warning("Marketplace DB unreadable, starting fresh: %s", exc)
    data = _blank_db()
    _seed_db(data)
    _write_db(data)
    return data


def _write_db(data: dict) -> None:
    path = settings.db_path
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=2), encoding="utf-8")
    tmp.replace(path)


# ------------------------------------------------------------------ seeding
SEED_USERS = [
    {"user_id": "user_alex", "username": "alex_chen", "display_name": "Alex Chen",
     "location": "San Francisco, CA"},
    {"user_id": "user_maya", "username": "maya_lin", "display_name": "Maya Lin",
     "location": "San Jose, CA"},
    {"user_id": "user_sam", "username": "sam_parker", "display_name": "Sam Parker",
     "location": "Oakland, CA"},
]


def _avatar(display_name: str) -> str:
    seed = display_name.replace(" ", "%20")
    return f"https://api.dicebear.com/9.x/initials/png?seed={seed}"


def _seed_db(data: dict) -> None:
    for seed in SEED_USERS:
        data["users"][seed["user_id"]] = {
            "user_id": seed["user_id"],
            "username": seed["username"],
            "display_name": seed["display_name"],
            "avatar_url": _avatar(seed["display_name"]),
            "location": seed["location"],
            "wallet_balance": 500.0,
            "created_at": _now(),
        }
    seed_job = {
        "job_id": "job_seed_sam_1",
        "user_id": "user_sam",
        "status": "completed",
        "video_url": "",
        "duration_sec": 12.0,
        "transcript": "Selling this JBL speaker and IKEA chair from my living room.",
        "items": [],
        "created_at": _now(),
    }
    seed_items = [
        {
            "key": "speaker", "spoken_name": "JBL Flip speaker",
            "seo_title": "JBL Flip 5 Portable Bluetooth Speaker",
            "category": "Audio", "price": 60.0,
            "spoken_claim": "lightly used",
            "ai_score": 8.8,
            "ai_visual_notes": "Fabric and casing look clean with no visible tears or dents.",
            "description": "Lightly used JBL Flip 5 in great shape. Loud, punchy sound and holds a charge like new.",
            "timestamp_sec": 3.0,
        },
        {
            "key": "chair", "spoken_name": "IKEA armchair",
            "seo_title": "IKEA Poang-Style Bentwood Armchair",
            "category": "Furniture", "price": 120.0,
            "spoken_claim": "good condition",
            "ai_score": 9.0,
            "ai_visual_notes": "Frame and cushion show only light wear; no stains or structural damage visible.",
            "description": "Comfortable bentwood armchair with cushion. Sturdy frame, smoke-free home.",
            "timestamp_sec": 8.0,
        },
    ]
    for i, item in enumerate(seed_items):
        assets = _generate_seed_assets(item["key"], item["seo_title"], item["price"])
        listing_id = f"listing_seed_{i + 1}"
        item_id = f"item_{i + 1}"
        data["listings"][listing_id] = {
            "listing_id": listing_id,
            "job_id": seed_job["job_id"],
            "item_id": item_id,
            "seller_id": "user_sam",
            "seller_name": "Sam Parker",
            "seller_username": "sam_parker",
            "seller_avatar": _avatar("Sam Parker"),
            "seller_location": "Oakland, CA",
            "status": "active",
            "buyer_id": None,
            "buyer_name": None,
            "sold_at": None,
            "spoken_name": item["spoken_name"],
            "seo_title": item["seo_title"],
            "category": item["category"],
            "price": {"amount": item["price"], "currency": "USD",
                      "formatted": format_price(item["price"])},
            "timestamp_sec": item["timestamp_sec"],
            "video_url": "",
            "condition": {
                "spoken_claim": item["spoken_claim"],
                "ai_score": item["ai_score"],
                "ai_badge_text": f"{item['ai_score']:.1f}/10 • Verified Clean",
                "ai_visual_notes": item["ai_visual_notes"],
            },
            "description": item["description"],
            "bounding_box": [160, 120, 480, 360],
            "assets": assets,
            "created_at": _now(),
        }
        seed_job["items"].append({
            "item_id": item_id,
            "spoken_name": item["spoken_name"],
            "seo_title": item["seo_title"],
            "category": item["category"],
            "price": {"amount": item["price"], "currency": "USD",
                      "formatted": format_price(item["price"])},
            "timestamp_sec": item["timestamp_sec"],
            "condition": {
                "spoken_claim": item["spoken_claim"],
                "ai_score": item["ai_score"],
                "ai_badge_text": f"{item['ai_score']:.1f}/10 • Verified Clean",
                "ai_visual_notes": item["ai_visual_notes"],
            },
            "description": item["description"],
            "tags": [],
            "bounding_box": [160, 120, 480, 360],
            "assets": assets,
            "is_published": True,
            "published_listing_id": listing_id,
        })
    data["jobs"][seed_job["job_id"]] = seed_job


def _generate_seed_assets(key: str, title: str, price: float) -> dict:
    """Procedural demo assets via the real compositor path."""
    from app.services.compositor_service import (
        create_hud_overlay,
        create_studio_showcase,
        extract_real_object_cutout,
    )

    seed_dir = settings.static_path / "seed" / key
    seed_dir.mkdir(parents=True, exist_ok=True)

    # Synthetic "room frame": warm gradient + floor + product silhouette.
    h, w = 480, 640
    yy = np.linspace(0, 1, h)[:, None]
    room = np.zeros((h, w, 3), dtype=np.float32)
    room[..., 0] = 96 + 40 * yy  # B
    room[..., 1] = 88 + 36 * yy  # G
    room[..., 2] = 82 + 30 * yy  # R
    cv2.rectangle(room, (0, 360), (w, h), (70, 78, 92), -1)
    frame = room.astype(np.uint8)
    mask = np.zeros((h, w), np.uint8)
    if key == "speaker":
        cv2.rectangle(mask, (220, 150), (420, 350), 255, -1)
        cv2.rectangle(frame, (220, 150), (420, 350), (35, 33, 40), -1)
        cv2.rectangle(frame, (220, 150), (420, 350), (200, 200, 200), 3)
    else:
        cv2.ellipse(mask, (320, 260), (130, 110), 0, 0, 360, 255, -1)
        cv2.ellipse(frame, (320, 260), (130, 110), 0, 0, 360, (120, 72, 40), -1)
    bbox = [160, 120, 480, 360]

    create_hud_overlay(frame, mask, bbox, title.split("—")[0].strip()[:24],
                       format_price(price), seed_dir / "sam_hud_overlay.png")
    extract_real_object_cutout(frame, mask, bbox, seed_dir / "real_cutout.png")
    cv2.imwrite(str(seed_dir / "raw_frame.jpg"), frame)

    from app.services.compositor_service import generate_procedural_studio_backdrop
    bg = generate_procedural_studio_backdrop()
    badge = f"{8.8 if key == 'speaker' else 9.0:.1f}/10 • Verified Clean"
    create_studio_showcase(seed_dir / "real_cutout.png", bg, format_price(price),
                           title, badge,
                           seed_dir / "studio_showcase.png",
                           seed_dir / "showcase_pricetag.png")
    base = f"/static/seed/{key}"
    return {
        "raw_frame_url": f"{base}/raw_frame.jpg",
        "sam_mask_overlay_url": f"{base}/sam_hud_overlay.png",
        "real_cutout_png_url": f"{base}/real_cutout.png",
        "studio_showcase_url": f"{base}/studio_showcase.png",
        "showcase_with_pricetag_url": f"{base}/showcase_pricetag.png",
    }


# -------------------------------------------------------------------- users
def list_users() -> list[UserAccount]:
    with _lock:
        data = _load_db()
        return [UserAccount(**u) for u in data["users"].values()]


def get_user(user_id: str) -> UserAccount | None:
    with _lock:
        data = _load_db()
        u = data["users"].get(user_id)
        return UserAccount(**u) if u else None


def create_user(username: str, display_name: str, location: str) -> UserAccount:
    uname = username.strip().lstrip("@")
    if not uname:
        raise ValueError("Username is required")
    with _lock:
        data = _load_db()
        for u in data["users"].values():
            if u["username"].lower() == uname.lower():
                raise ValueError(f"Username @{uname} is already taken")
        user_id = _new_id("user")
        name = display_name.strip() or uname
        user = {
            "user_id": user_id,
            "username": uname,
            "display_name": name,
            "avatar_url": _avatar(name),
            "location": location.strip(),
            "wallet_balance": 500.0,
            "created_at": _now(),
        }
        data["users"][user_id] = user
        _write_db(data)
        return UserAccount(**user)


# --------------------------------------------------------------------- jobs
def save_job(job: JobResponse) -> None:
    with _lock:
        data = _load_db()
        data["jobs"][job.job_id] = job.model_dump()
        _write_db(data)


def get_job(job_id: str) -> JobResponse | None:
    with _lock:
        data = _load_db()
        j = data["jobs"].get(job_id)
        return JobResponse(**j) if j else None


def list_user_jobs(user_id: str) -> list[JobResponse]:
    with _lock:
        data = _load_db()
        jobs = [JobResponse(**j) for j in data["jobs"].values()
                if j.get("user_id") == user_id]
        jobs.sort(key=lambda j: j.created_at or "", reverse=True)
        return jobs


def mark_item_published(job_id: str, item_id: str, listing_id: str) -> None:
    with _lock:
        data = _load_db()
        job = data["jobs"].get(job_id)
        if job:
            for item in job.get("items", []):
                if item.get("item_id") == item_id:
                    item["is_published"] = True
                    item["published_listing_id"] = listing_id
            _write_db(data)


# ---------------------------------------------------------------- listings
def publish_items(
    user_id: str,
    job_id: str,
    item_ids: list[str] | None,
    overrides: dict,
) -> list[MarketplaceListing]:
    with _lock:
        data = _load_db()
        seller = data["users"].get(user_id)
        if seller is None:
            raise ValueError(f"Unknown user: {user_id}")
        job = data["jobs"].get(job_id)
        if job is None:
            raise ValueError(f"Unknown job: {job_id}")
        if job.get("user_id") and job["user_id"] != user_id:
            raise ValueError("Job belongs to a different account")
        wanted = set(item_ids) if item_ids else None
        published: list[MarketplaceListing] = []
        for item in job.get("items", []):
            if wanted is not None and item.get("item_id") not in wanted:
                continue
            if item.get("is_published"):
                continue
            ov = overrides.get(item["item_id"], {}) if isinstance(overrides, dict) else {}
            price = float(ov.get("price", item["price"]["amount"])
                          if isinstance(ov, dict) else item["price"]["amount"])
            title = (ov.get("seo_title") or item.get("seo_title") or item["spoken_name"]
                     if isinstance(ov, dict) else item.get("seo_title"))
            listing_id = _new_id("listing")
            record = {
                "listing_id": listing_id,
                "job_id": job_id,
                "item_id": item["item_id"],
                "seller_id": user_id,
                "seller_name": seller["display_name"],
                "seller_username": seller["username"],
                "seller_avatar": seller.get("avatar_url", ""),
                "seller_location": seller.get("location", ""),
                "status": "active",
                "buyer_id": None,
                "buyer_name": None,
                "sold_at": None,
                "spoken_name": item["spoken_name"],
                "seo_title": title,
                "category": item.get("category", "General"),
                "price": {"amount": price, "currency": "USD",
                          "formatted": format_price(price)},
                "timestamp_sec": float(item.get("timestamp_sec", 0.0)),
                "video_url": job.get("video_url", ""),
                "condition": item["condition"],
                "description": item.get("description", ""),
                "bounding_box": item.get("bounding_box", []),
                "assets": item["assets"],
                "created_at": _now(),
            }
            data["listings"][listing_id] = record
            item["is_published"] = True
            item["published_listing_id"] = listing_id
            if price != float(item["price"]["amount"]):
                item["price"] = record["price"]
            if title != item.get("seo_title"):
                item["seo_title"] = title
            published.append(MarketplaceListing(**record))
        if not published:
            raise ValueError("Nothing to publish: items already published or unknown")
        _write_db(data)
        return published


def list_listings(
    q: str = "",
    category: str = "",
    min_price: float | None = None,
    max_price: float | None = None,
    min_condition: float | None = None,
    status: str = "active",
) -> list[MarketplaceListing]:
    with _lock:
        data = _load_db()
        out: list[MarketplaceListing] = []
        needle = q.strip().lower()
        for record in data["listings"].values():
            if status and record.get("status") != status:
                continue
            if category and category.lower() != "all" \
                    and record.get("category", "").lower() != category.lower():
                continue
            price = float(record["price"]["amount"])
            if min_price is not None and price < min_price:
                continue
            if max_price is not None and price > max_price:
                continue
            if min_condition is not None \
                    and float(record["condition"]["ai_score"]) < min_condition:
                continue
            if needle:
                hay = " ".join([
                    record.get("seo_title", ""), record.get("spoken_name", ""),
                    record.get("description", ""), record.get("category", ""),
                ]).lower()
                if needle not in hay:
                    continue
            out.append(MarketplaceListing(**record))
        out.sort(key=lambda r: r.created_at or "", reverse=True)
        return out


def get_listing(listing_id: str) -> MarketplaceListing | None:
    with _lock:
        data = _load_db()
        record = data["listings"].get(listing_id)
        return MarketplaceListing(**record) if record else None


def buy_listing(listing_id: str, buyer_id: str) -> MarketplaceListing:
    with _lock:
        data = _load_db()
        record = data["listings"].get(listing_id)
        if record is None:
            raise ValueError(f"Unknown listing: {listing_id}")
        if record.get("status") != "active":
            raise ValueError("Item is no longer available")
        buyer = data["users"].get(buyer_id)
        if buyer is None:
            raise ValueError(f"Unknown buyer: {buyer_id}")
        if record["seller_id"] == buyer_id:
            raise ValueError("You cannot buy your own listing")
        amount = float(record["price"]["amount"])
        if float(buyer["wallet_balance"]) < amount:
            raise ValueError(
                f"Insufficient balance (${float(buyer['wallet_balance']):.2f} < ${amount:.2f})")
        seller = data["users"].get(record["seller_id"])
        buyer["wallet_balance"] = round(float(buyer["wallet_balance"]) - amount, 2)
        if seller is not None:
            seller["wallet_balance"] = round(float(seller["wallet_balance"]) + amount, 2)
        record["status"] = "sold"
        record["buyer_id"] = buyer_id
        record["buyer_name"] = buyer["display_name"]
        record["sold_at"] = _now()
        data["orders"].append({
            "order_id": _new_id("order"),
            "listing_id": listing_id,
            "buyer_id": buyer_id,
            "seller_id": record["seller_id"],
            "amount": amount,
            "sold_at": record["sold_at"],
        })
        _write_db(data)
        return MarketplaceListing(**record)


# ---------------------------------------------------------------- dashboard
def get_dashboard(user_id: str) -> dict:
    with _lock:
        data = _load_db()
        user = data["users"].get(user_id)
        if user is None:
            raise ValueError(f"Unknown user: {user_id}")
        jobs = sorted(
            (j for j in data["jobs"].values() if j.get("user_id") == user_id),
            key=lambda j: j.get("created_at", ""), reverse=True)
        listings = sorted(data["listings"].values(),
                          key=lambda r: r.get("created_at", ""), reverse=True)
        return {
            "user": user,
            "extraction_jobs": jobs,
            "active_listings": [r for r in listings
                                if r["seller_id"] == user_id and r["status"] == "active"],
            "sold_listings": [r for r in listings
                              if r["seller_id"] == user_id and r["status"] == "sold"],
            "purchased_listings": [r for r in listings
                                   if r.get("buyer_id") == user_id],
        }
