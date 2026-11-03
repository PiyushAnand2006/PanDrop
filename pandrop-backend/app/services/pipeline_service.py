"""End-to-end async orchestration: upload -> transcript -> items -> showcase cards."""
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
from app.utils.image_utils import format_price

logger = logging.getLogger(__name__)


def new_job_id() -> str:
    return f"job_{uuid.uuid4().hex[:8]}"


def _static_url(job_id: str, *parts: str) -> str:
    return "/static/jobs/" + job_id + "/" + "/".join(parts)


async def _process_item(
    item_index: int,
    item,
    video_path: Path,
    job_dir: Path,
    job_id: str,
    meta: MetaAIService,
) -> ProcessedItem:
    item_id = f"item_{item_index + 1}"
    item_dir = job_dir / item_id
    item_dir.mkdir(parents=True, exist_ok=True)
    price_formatted = format_price(float(item.asking_price))

    # 1. Candidate frames around the spoken timestamp.
    frame_paths = media_service.extract_candidate_frames(
        video_path,
        float(item.timestamp_sec),
        item_dir / "candidates",
        window_sec=settings.frame_window_sec,
        count=settings.candidate_frames_per_item,
    )
    if not frame_paths:
        raise ValueError(f"No frames could be extracted for {item_id} at {item.timestamp_sec}s")

    # 2. Muse Wonder: best frame + bbox + condition audit.
    audit = await meta.analyze_frames_and_audit_condition(item, frame_paths)
    best_idx = max(0, min(int(audit.best_frame_index), len(frame_paths) - 1))
    best_frame_path = item_dir / "raw_frame.jpg"
    frame_bgr = cv2.imread(str(frame_paths[best_idx]))
    if frame_bgr is None:
        raise ValueError(f"Failed to read best frame for {item_id}")
    cv2.imwrite(str(best_frame_path), frame_bgr)

    # 3. SAM 3.1: real-object mask.
    mask_bytes = await meta.segment_real_object(
        best_frame_path, item.spoken_name, list(audit.bounding_box), list(audit.point_coords)
    )
    mask = decode_mask_bytes(mask_bytes)
    (item_dir / "mask.png").write_bytes(mask_bytes)

    # 4. Compositor: HUD overlay + real cutout + studio showcase.
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

    # 5. Muse Spark listing copy.
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
        path = out_dir / f"scan_{i}.jpg"
        cv2.imwrite(str(path), frame)
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
            video_path, job_dir / "scan", count=3
        )
        if scan_paths:
            items = await meta.detect_items_from_frames(scan_paths, scan_times)
            logger.info(
                "Vision-only extraction found %d item(s) for job %s",
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

    # Fan out: all item workers run concurrently.
    results = await asyncio.gather(
        *(
            _process_item(i, item, video_path, job_dir, job_id, meta)
            for i, item in enumerate(items)
        ),
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
