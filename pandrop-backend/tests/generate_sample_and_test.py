"""CLI verification script.

Generates a synthetic sample video (coloured product-like objects on a desk
background, with a silent audio track), then either:
  - runs the pipeline in-process (default, no server needed), or
  - POSTs it to a running server with --url http://localhost:8000

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


def main() -> int:
    parser = argparse.ArgumentParser(description="PanDrop pipeline smoke test")
    parser.add_argument("--url", default="", help="Running server base URL (omit for in-process)")
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

    print(json.dumps(data, indent=2))

    # Assertions: the pipeline must produce real showcase assets.
    assert data["status"] == "completed", data
    assert data["items"], "Expected at least one detected item"
    for item in data["items"]:
        for key, url in item["assets"].items():
            rel = ROOT / url.lstrip("/")
            assert rel.exists(), f"Missing asset for {key}: {rel}"
            assert rel.stat().st_size > 0, f"Empty asset for {key}: {rel}"
    print(f"\nPASS: {len(data['items'])} item(s), all showcase assets exist on disk.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
