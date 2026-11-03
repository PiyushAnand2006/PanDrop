"""CLI verification script: extraction pipeline + marketplace loop.

Phase 1 — generates a synthetic sample video, runs the extraction pipeline
either in-process (default) or against a server (--url), and asserts every
showcase asset exists on disk.

Phase 2 — proves the unified marketplace end to end over HTTP:
seeded demo accounts -> publish extracted items -> search/filter ->
inspect listing -> buy with wallet transfer -> dashboards. Also covers
the rejection paths (buy own listing, double-buy).

Usage:
    python tests/generate_sample_and_test.py
    python tests/generate_sample_and_test.py --url http://localhost:8000
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import uuid
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# Demo speech so the offline heuristic parser has items to extract.
os.environ.setdefault(
    "PANDROP_DEMO_TRANSCRIPT",
    "Selling these Sony headphones for 100 dollars, barely used, "
    "and this mechanical keyboard for 40 dollars, good condition",
)


def generate_sample_video(out_path: Path, seconds: int = 6, fps: int = 24) -> Path:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    width, height = 640, 480
    writer = cv2.VideoWriter(
        str(out_path), cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height)
    )
    if not writer.isOpened():
        raise RuntimeError("Could not open VideoWriter for sample video")
    for frame_idx in range(seconds * fps):
        frame = np.full((height, width, 3), (70, 60, 50), dtype=np.uint8)
        # Desk surface.
        cv2.rectangle(frame, (0, 340), (width, height), (90, 110, 130), -1)
        # "Headphones": two ear cups + headband.
        cv2.circle(frame, (220, 240), 55, (30, 30, 30), -1)
        cv2.circle(frame, (340, 240), 55, (30, 30, 30), -1)
        cv2.ellipse(frame, (280, 240), (115, 95), 0, 180, 360, (30, 30, 30), 14)
        # "Keyboard": rectangle + key grid, drifting slightly for motion.
        kx = 380 + int(6 * np.sin(frame_idx / 12))
        cv2.rectangle(frame, (kx, 320), (kx + 220, 390), (210, 210, 210), -1)
        for r in range(3):
            for c in range(8):
                cv2.rectangle(
                    frame,
                    (kx + 10 + c * 25, 330 + r * 20),
                    (kx + 28 + c * 25, 346 + r * 20),
                    (60, 60, 70), -1,
                )
        cv2.putText(
            frame, "PanDrop sample room", (16, 34),
            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2,
        )
        writer.write(frame)
    writer.release()
    return out_path


async def _run_in_process(video_path: Path) -> dict:
    from app.services.pipeline_service import process_video

    result = await process_video(video_path.read_bytes(), video_path.name)
    return result.model_dump()


def _run_via_http(video_path: Path, base_url: str) -> dict:
    import httpx

    with open(video_path, "rb") as fh:
        resp = httpx.post(
            f"{base_url.rstrip('/')}/api/v1/process-video",
            files={"file": (video_path.name, fh, "video/mp4")},
            timeout=300,
        )
    resp.raise_for_status()
    return resp.json()


class _Client:
    """Minimal HTTP helper over TestClient (in-process) or httpx (--url)."""

    def __init__(self, base_url: str = ""):
        self.base_url = _validate_base_url(base_url)
        self._tc = None
        if not self.base_url:
            from fastapi.testclient import TestClient

            from app.main import app

            self._tc = TestClient(app)

    def _call(self, method: str, path: str, **kwargs):
        if self._tc is not None:
            resp = getattr(self._tc, method)(path, **kwargs)
            return resp.status_code, resp.json()
        import httpx

        resp = httpx.request(method, self.base_url + path, timeout=60, **kwargs)
        return resp.status_code, resp.json()

    def get(self, path: str, **kwargs):
        return self._call("get", path, **kwargs)

    def post(self, path: str, **kwargs):
        return self._call("post", path, **kwargs)


def _validate_base_url(base_url: str) -> str:
    """Validate the operator-supplied test target: http/https with an explicit
    hostname, and loopback-only unless explicitly opted in via --allow-remote."""
    from urllib.parse import urlparse

    if not base_url:
        return ""
    parsed = urlparse(base_url.rstrip("/"))
    if parsed.scheme not in ("http", "https"):
        raise SystemExit(f"Unsupported URL scheme {parsed.scheme!r} — use http or https")
    host = parsed.hostname
    if not host:
        raise SystemExit("Base URL must include a hostname")
    loopback = host in ("localhost", "127.0.0.1", "::1") or host.endswith(".local")
    if not loopback and "--allow-remote" not in sys.argv:
        raise SystemExit(
            f"Refusing non-loopback test target {host!r} by default (SSRF guard). "
            "Pass --allow-remote to test a remote server."
        )
    return base_url.rstrip("/")


def _check(status: int, body: dict, expect: int, label: str) -> dict:
    assert status == expect, f"{label}: expected {expect}, got {status}: {body}"
    return body


def verify_marketplace(client: _Client, job: dict) -> None:
    # Seeded demo accounts.
    status, users = client.get("/api/v1/users")
    users = _check(status, users, 200, "list users")
    names = {u["username"] for u in users}
    assert {"alex_chen", "maya_lin", "sam_parker"} <= names, f"missing seed users: {names}"
    print(f"Marketplace users present: {sorted(names)}")

    # Seeded discovery listings.
    status, seeds = client.get("/api/v1/marketplace/listings")
    seeds = _check(status, seeds, 200, "list seed listings")
    assert len(seeds) >= 2, f"expected seeded listings, got {len(seeds)}"
    print(f"Seeded discovery listings: {len(seeds)}")

    # Fresh seller + buyer so wallet assertions stay deterministic.
    tag = uuid.uuid4().hex[:6]
    status, seller = client.post("/api/v1/users", json={
        "username": f"seller_{tag}", "display_name": f"Test Seller {tag}"})
    seller = _check(status, seller, 200, "create seller")
    status, buyer = client.post("/api/v1/users", json={
        "username": f"buyer_{tag}", "display_name": f"Test Buyer {tag}"})
    buyer = _check(status, buyer, 200, "create buyer")
    assert seller["wallet_balance"] == 500.0 and buyer["wallet_balance"] == 500.0

    # Re-run extraction under the seller account, then publish everything.
    if client.base_url:
        import httpx

        with open(ROOT / "tests" / "sample_room.mp4", "rb") as fh:
            resp = httpx.post(
                client.base_url + "/api/v1/process-video",
                files={"file": ("sample_room.mp4", fh, "video/mp4")},
                data={"user_id": seller["user_id"]},
                timeout=300,
            )
            resp.raise_for_status()
            job = resp.json()
    else:
        from app.services.pipeline_service import process_video as _pv

        video = (ROOT / "tests" / "sample_room.mp4").read_bytes()
        job = asyncio.run(_pv(video, "sample_room.mp4", seller["user_id"])).model_dump()
    assert job["user_id"] == seller["user_id"], job

    status, listings = client.post("/api/v1/marketplace/publish", json={
        "user_id": seller["user_id"], "job_id": job["job_id"]})
    listings = _check(status, listings, 200, "publish all")
    assert len(listings) == len(job["items"]), (len(listings), len(job["items"]))
    print(f"Published {len(listings)} listing(s) for {seller['username']}")

    # Search, filter, inspect (query derived from our own listing).
    probe = (listings[0]["spoken_name"] or listings[0]["seo_title"]).split()[0]
    status, found = client.get("/api/v1/marketplace/listings", params={"q": probe})
    found = _check(status, found, 200, "search listings")
    assert any(job["job_id"] == r["job_id"] for r in found), "search missed new listing"
    total_all = round(sum(r["price"]["amount"] for r in listings), 2)
    status, pricey = client.get("/api/v1/marketplace/listings",
                                params={"min_price": total_all + 1000})
    pricey = _check(status, pricey, 200, "price filter")
    assert not any(job["job_id"] == r["job_id"] for r in pricey)

    target = listings[0]
    status, detail = client.get(f"/api/v1/marketplace/{target['listing_id']}")
    detail = _check(status, detail, 200, "inspect listing")
    assert detail["assets"]["real_cutout_png_url"], "cutout URL missing"
    assert detail["condition"]["ai_score"] >= 1.0
    total = round(sum(r["price"]["amount"] for r in listings), 2)

    # Buy the first item as the fresh buyer.
    status, sold = client.post(f"/api/v1/marketplace/{target['listing_id']}/buy",
                               json={"buyer_id": buyer["user_id"]})
    sold = _check(status, sold, 200, "buy listing")
    assert sold["status"] == "sold" and sold["buyer_id"] == buyer["user_id"]
    amount = target["price"]["amount"]

    # Negative paths: double-buy and self-buy.
    status, body = client.post(f"/api/v1/marketplace/{target['listing_id']}/buy",
                               json={"buyer_id": buyer["user_id"]})
    assert status == 400, f"double-buy should fail, got {status}: {body}"
    other = listings[1] if len(listings) > 1 else target
    _ = other
    status, own = client.post("/api/v1/marketplace/publish", json={
        "user_id": buyer["user_id"], "job_id": job["job_id"]})
    # Items already published under the seller; publishing same job again fails.
    assert status == 400, f"republish should fail, got {status}: {own}"

    # Wallets + dashboards.
    status, dash_seller = client.get(f"/api/v1/users/{seller['user_id']}/dashboard")
    dash_seller = _check(status, dash_seller, 200, "seller dashboard")
    status, dash_buyer = client.get(f"/api/v1/users/{buyer['user_id']}/dashboard")
    dash_buyer = _check(status, dash_buyer, 200, "buyer dashboard")
    assert dash_seller["user"]["wallet_balance"] == round(500.0 + amount, 2), dash_seller["user"]
    assert dash_buyer["user"]["wallet_balance"] == round(500.0 - amount, 2), dash_buyer["user"]
    assert len(dash_seller["sold_listings"]) == 1, dash_seller["sold_listings"]
    assert len(dash_seller["active_listings"]) == len(listings) - 1
    assert len(dash_buyer["purchased_listings"]) == 1
    assert len(dash_seller["extraction_jobs"]) >= 1
    print(f"Buy flow OK: ${amount:g} moved seller={dash_seller['user']['wallet_balance']} "
          f"buyer={dash_buyer['user']['wallet_balance']} (total published ${total:g})")


def main() -> int:
    parser = argparse.ArgumentParser(description="PanDrop pipeline + marketplace test")
    parser.add_argument("--url", default="", help="Running server base URL (omit for in-process)")
    parser.add_argument(
        "--allow-remote",
        action="store_true",
        help="Permit a non-loopback --url target (SSRF guard defaults to localhost)",
    )
    parser.add_argument("--video", default="", help="Existing video to test instead of generating one")
    args = parser.parse_args()

    if args.video:
        video_path = Path(args.video)
    else:
        video_path = ROOT / "tests" / "sample_room.mp4"
        generate_sample_video(video_path)
        print(f"Sample video generated: {video_path}")

    if args.url:
        data = _run_via_http(video_path, args.url)
    else:
        data = asyncio.run(_run_in_process(video_path))

    print(json.dumps({k: v for k, v in data.items() if k != "items"}, indent=2))
    print(f"items: {[(i['spoken_name'], i['price']['formatted']) for i in data['items']]}")

    # Assertions: the pipeline must produce real showcase assets.
    assert data["status"] == "completed", data
    assert data["items"], "Expected at least one detected item"
    for item in data["items"]:
        for key, url in item["assets"].items():
            rel = ROOT / url.lstrip("/")
            assert rel.exists(), f"Missing asset for {key}: {rel}"
            assert rel.stat().st_size > 0, f"Empty asset for {key}: {rel}"
    print(f"\nPASS phase 1: {len(data['items'])} item(s), all showcase assets exist on disk.")

    verify_marketplace(_Client(args.url), data)
    print("\nPASS phase 2: marketplace publish/search/inspect/buy loop verified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
