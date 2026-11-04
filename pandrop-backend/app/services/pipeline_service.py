"""End-to-end async orchestration: upload -> transcript -> items -> showcase cards.

Two-phase per item: first all audits run (frames + Wonder boxes), then all
boxes are sanitized jointly (degenerate fallback + pairwise de-overlap so no
cutout contains its neighbour), then segmentation/compositing fans out.
"""
from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

import cv2

from app.config import settings
from app.schemas import (
    ConditionInfo,
    ItemAssets,
    JobResponse,
    PriceInfo,
    ProcessedItem,
)
from app.services import media_service
from app.services.compositor_service import (
    create_hud_overlay,
    create_studio_showcase,
    decode_mask_bytes,
    extract_real_object_cutout,
)
from app.services.meta_ai_service import MetaAIService
from app.utils.image_utils import central_bbox, format_price

logger = logging.getLogger(__name__)


def new_job_id() -> str:
    return f"job_{uuid.uuid4().hex[:8]}"


def _static_url(job_id: str, *parts: str) -> str:
    return "/static/jobs/" + job_id + "/" + "/".join(parts)


def sanitize_audit_boxes(audits, frame_w: int, frame_h: int) -> list[dict]:
    """Fix sloppy detector boxes before segmentation (pure function).

    - Degenerate/tiny boxes fall back to a central box (a point-sized box
      starves grabCut and yields an empty mask).
    - Overlapping boxes of different items are split along the overlap's
      longer axis at the midpoint between the two object points, so each
      cutout keeps its own side instead of its neighbour.
    """
    fixed = []
    for audit in audits:
        x1, y1, x2, y2 = [int(v) for v in audit.bounding_box]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(frame_w, x2), min(frame_h, y2)
        if max(x2 - x1, 0) * max(y2 - y1, 0) < 0.005 * frame_w * frame_h:
            x1, y1, x2, y2 = central_bbox(frame_w, frame_h)
            px, py = frame_w // 2, frame_h // 2
        else:
            px, py = [int(v) for v in audit.point_coords]
        fixed.append({"bbox": [x1, y1, x2, y2], "point": [px, py], "audit": audit})
    for i in range(len(fixed)):
        for j in range(i + 1, len(fixed)):
            a, b = fixed[i], fixed[j]
            ox1 = max(a["bbox"][0], b["bbox"][0])
            oy1 = max(a["bbox"][1], b["bbox"][1])
            ox2 = min(a["bbox"][2], b["bbox"][2])
            oy2 = min(a["bbox"][3], b["bbox"][3])
            ow, oh = max(ox2 - ox1, 0), max(oy2 - oy1, 0)
            if ow <= 0 or oh <= 0:
                continue
            ia = (a["bbox"][2] - a["bbox"][0]) * (a["bbox"][3] - a["bbox"][1])
            ib = (b["bbox"][2] - b["bbox"][0]) * (b["bbox"][3] - b["bbox"][1])
            if ow * oh / max(min(ia, ib), 1) < 0.15:
                continue
            if ow >= oh:  # side-by-side: split vertically
                cut = (a["point"][0] + b["point"][0]) // 2
                cut = max(ox1 + 1, min(ox2 - 1, cut))
                if a["point"][0] <= b["point"][0]:
                    a["bbox"][2] = min(a["bbox"][2], cut)
                    b["bbox"][0] = max(b["bbox"][0], cut)
                else:
                    b["bbox"][2] = min(b["bbox"][2], cut)
                    a["bbox"][0] = max(a["bbox"][0], cut)
            else:  # stacked: split horizontally
                cut = (a["point"][1] + b["point"][1]) // 2
                cut = max(oy1 + 1, min(oy2 - 1, cut))
                if a["point"][1] <= b["point"][1]:
                    a["bbox"][3] = min(a["bbox"][3], cut)
                    b["bbox"][1] = max(b["bbox"][1], cut)
                else:
                    b["bbox"][3] = min(b["bbox"][3], cut)
                    a["bbox"][1] = max(a["bbox"][1], cut)
    out = []
    for f in fixed:
        x1, y1, x2, y2 = f["bbox"]
        if x2 - x1 < 8 or y2 - y1 < 8:
            x1, y1, x2, y2 = central_bbox(frame_w, frame_h)
            f["point"] = [frame_w // 2, frame_h // 2]
        f["bbox"] = [x1, y1, x2, y2]
        out.append(f)
    return out


async def _audit_item(
    item_index: int,
    item,
    video_path: Path,
    job_dir: Path,
    meta: MetaAIService,
) -> dict:
    """Phase 1: candidate frames + Wonder audit for one item."""
    item_id = f"item_{item_index + 1}"
    item_dir = job_dir / item_id
    item_dir.mkdir(parents=True, exist_ok=True)

    frame_paths = media_service.extract_candidate_frames(
        video_path,
        float(item.timestamp_sec),
        item_dir / "candidates",
        window_sec=settings.frame_window_sec,
        count=settings.candidate_frames_per_item,
    )
    if not frame_paths:
        raise ValueError(f"No frames could be extracted for {item_id} at {item.timestamp_sec}s")

    audit = await meta.analyze_frames_and_audit_condition(item, frame_paths)
    best_idx = max(0, min(int(audit.best_frame_index), len(frame_paths) - 1))
    best_frame_path = item_dir / "raw_frame.jpg"
    frame_bgr = cv2.imread(str(frame_paths[best_idx]))
    if frame_bgr is None:
        raise ValueError(f"Failed to read best frame for {item_id}")
    cv2.imwrite(str(best_frame_path), frame_bgr)
    return {
        "index": item_index,
        "item": item,
        "item_id": item_id,
        "item_dir": item_dir,
        "audit": audit,
        "frame_paths": frame_paths,
        "best_frame_path": best_frame_path,
        "frame_bgr": frame_bgr,
    }


async def _render_item(prep: dict, job_id: str, meta: MetaAIService) -> ProcessedItem:
    """Phase 2: segment + composite one item (audit already sanitized)."""
    item, item_id = prep["item"], prep["item_id"]
    item_dir, audit = prep["item_dir"], prep["audit"]
    frame_bgr, best_frame_path = prep["frame_bgr"], prep["best_frame_path"]
    price_formatted = format_price(float(item.asking_price))

    mask_bytes = await meta.segment_real_object(
        best_frame_path, item.spoken_name, list(audit.bounding_box), list(audit.point_coords)
    )
    mask = decode_mask_bytes(mask_bytes)
    (item_dir / "mask.png").write_bytes(mask_bytes)

    create_hud_overlay(
        frame_bgr, mask, list(audit.bounding_box),
        item.spoken_name, price_formatted, item_dir / "sam_hud_overlay.png",
    )
    extract_real_object_cutout(
        frame_bgr, mask, list(audit.bounding_box), item_dir / "real_cutout.png"
    )
    bg_bytes = await meta.generate_studio_backdrop(
        item.spoken_name, item.category, item_dir / "real_cutout.png"
    )
    create_studio_showcase(
        item_dir / "real_cutout.png",
        bg_bytes,
        price_formatted,
        item.spoken_name,
        audit.ai_badge_text,
        item_dir / "studio_showcase.png",
        item_dir / "showcase_pricetag.png",
    )

    copy = await meta.generate_listing_copy(item, audit)

    return ProcessedItem(
        item_id=item_id,
        spoken_name=item.spoken_name,
        seo_title=copy.seo_title or item.spoken_name,
        category=item.category,
        price=PriceInfo(
            amount=float(item.asking_price), currency="USD", formatted=price_formatted
        ),
        timestamp_sec=float(item.timestamp_sec),
        condition=ConditionInfo(
            spoken_claim=item.spoken_condition,
            ai_score=float(audit.ai_condition_score),
            ai_badge_text=audit.ai_badge_text,
            ai_visual_notes=audit.ai_visual_notes,
        ),
        description=copy.description,
        tags=copy.tags,
        bounding_box=[int(v) for v in audit.bounding_box],
        assets=ItemAssets(
            raw_frame_url=_static_url(job_id, item_id, "raw_frame.jpg"),
            sam_mask_overlay_url=_static_url(job_id, item_id, "sam_hud_overlay.png"),
            real_cutout_png_url=_static_url(job_id, item_id, "real_cutout.png"),
            studio_showcase_url=_static_url(job_id, item_id, "studio_showcase.png"),
            showcase_with_pricetag_url=_static_url(job_id, item_id, "showcase_pricetag.png"),
        ),
    )


def _extract_scan_frames(
    video_path: Path, out_dir: Path, count: int = 3
) -> tuple[list[Path], list[float]]:
    """Grab `count` evenly spaced frames (with their timestamps) for
    vision-only product detection when the clip has no usable speech."""
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return [], []
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    out_dir.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []
    times: list[float] = []
    for i in range(count):
        idx = int((i + 0.5) * total / count) if total > 0 else i
        cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, idx))
        ok, frame = cap.read()
        if not ok:
            continue
        # Downscale oversized frames — smaller base64 payloads make the vision
        # model calls several times faster with no accuracy loss at 1024px.
        h, w = frame.shape[:2]
        if w > 1024:
            frame = cv2.resize(frame, (1024, int(h * 1024 / w)), interpolation=cv2.INTER_AREA)
        path = out_dir / f"scan_{i}.jpg"
        cv2.imwrite(str(path), frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
        paths.append(path)
        times.append(round(idx / fps, 2) if fps else 0.0)
    cap.release()
    return paths, times


async def process_video(
    video_bytes: bytes, filename: str, user_id: str = ""
) -> JobResponse:
    """Run the full pipeline for one uploaded video owned by ``user_id``."""
    media_service.validate_video_file(filename)
    if len(video_bytes) > settings.max_upload_mb * 1024 * 1024:
        raise ValueError(f"Upload exceeds {settings.max_upload_mb} MB limit")

    job_id = new_job_id()
    job_dir = settings.jobs_path / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    suffix = Path(filename).suffix.lower() or ".mp4"
    video_path = job_dir / f"input_video{suffix}"
    video_path.write_bytes(video_bytes)

    probe = media_service.probe_video(video_path)
    duration = float(probe.get("duration_sec", 0.0) or 0.0)

    audio_path = media_service.extract_audio(video_path, job_dir / "audio.wav")

    meta = MetaAIService()
    transcript = await meta.transcribe_audio(audio_path)
    if transcript.duration_sec <= 0:
        transcript = transcript.model_copy(update={"duration_sec": duration})

    items = await meta.extract_items_from_transcript(transcript)
    if not items:
        # No usable speech (silent or music-only clip): fall back to vision-only
        # extraction so products are still separated out of the video frames.
        logger.warning(
            "No items from speech for job %s; trying vision-only extraction", job_id
        )
        scan_paths, scan_times = _extract_scan_frames(
            video_path, job_dir / "scan", count=6
        )
        if scan_paths:
            items = await meta.detect_items_from_frames(scan_paths, scan_times)
            logger.info(
                "Vision-only extraction found %d item(s) for job %s",
                len(items), job_id,
            )
        if not items:
            # One more pass with a denser, differently-offset frame set: the
            # vision model sometimes returns [] on a first pass even when
            # products are visible.
            retry_paths, retry_times = _extract_scan_frames(
                video_path, job_dir / "scan_retry", count=9
            )
            if retry_paths:
                logger.warning(
                    "Vision pass 1 empty for job %s; retrying with %d frames",
                    job_id, len(retry_paths),
                )
                items = await meta.detect_items_from_frames(
                    retry_paths, retry_times
                )
                logger.info(
                    "Vision retry found %d item(s) for job %s",
                    len(items), job_id,
                )
    if not items:
        # Truly nothing to extract (e.g. no products visible at all) — complete
        # the job anyway so the UI can show its guided empty state instead of
        # an error.
        logger.warning(
            "No sellable items detected for job %s; completing with empty item list",
            job_id,
        )

    # Phase 1: audit every item (frames + Wonder boxes).
    preps = await asyncio.gather(
        *(
            _audit_item(i, item, video_path, job_dir, meta)
            for i, item in enumerate(items)
        ),
        return_exceptions=True,
    )
    audited = []
    for i, prep in enumerate(preps):
        if isinstance(prep, Exception):
            logger.error("Item %d audit failed: %s", i + 1, prep)
            raise ValueError(f"Processing failed for item {i + 1}: {prep}") from prep
        audited.append(prep)

    # Sanitize all boxes jointly (frame dims are identical across one video).
    if audited:
        fh, fw = audited[0]["frame_bgr"].shape[:2]
        fixed = sanitize_audit_boxes([p["audit"] for p in audited], fw, fh)
        for prep, f in zip(audited, fixed):
            prep["audit"] = f["audit"].model_copy(update={
                "bounding_box": f["bbox"],
                "point_coords": f["point"],
            })

    # Phase 2: segment + composite every item concurrently.
    results = await asyncio.gather(
        *(_render_item(prep, job_id, meta) for prep in audited),
        return_exceptions=True,
    )
    processed: list[ProcessedItem] = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            logger.error("Item %d failed: %s", i + 1, result)
            raise ValueError(f"Processing failed for item {i + 1}: {result}") from result
        processed.append(result)

    response = JobResponse(
        job_id=job_id,
        user_id=user_id,
        status="completed",
        video_url=_static_url(job_id, video_path.name),
        duration_sec=duration,
        transcript=transcript.text,
        items=processed,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    (job_dir / "result.json").write_text(
        json.dumps(response.model_dump(), indent=2), encoding="utf-8"
    )
    if user_id:
        from app.services import store_service

        store_service.save_job(response)
    return response


def load_job_result(job_id: str) -> JobResponse | None:
    path = settings.jobs_path / job_id / "result.json"
    if not path.exists():
        return None
    job = JobResponse(**json.loads(path.read_text(encoding="utf-8")))
    # Overlay publish flags from the store when available.
    try:
        from app.services import store_service

        stored = store_service.get_job(job_id)
        if stored is not None:
            if not job.user_id:
                job = job.model_copy(update={"user_id": stored.user_id})
            published = {
                item.item_id: item.published_listing_id
                for item in stored.items if item.is_published
            }
            if published:
                items = [
                    item.model_copy(update={
                        "is_published": True,
                        "published_listing_id": published[item.item_id],
                    }) if item.item_id in published else item
                    for item in job.items
                ]
                job = job.model_copy(update={"items": items})
    except Exception as exc:  # noqa: BLE001
        logger.warning("Store overlay failed for %s: %s", job_id, exc)
    return job
