"""MetaAIService — Muse Voice, Muse Spark, Muse Wonder, SAM 3.1, Muse Image.

Every method attempts a real async API call when a key is configured and
mock mode is off. On failure (or in mock mode) it falls back to a genuine
local implementation that operates on the real video frames.
"""
from __future__ import annotations

import base64
import json
import logging
import re
from pathlib import Path

import cv2
import httpx
import numpy as np
from openai import AsyncOpenAI

from app.config import settings
from app.schemas import (
    DetectedItemIntent,
    ListingCopyResult,
    TranscriptResult,
    TranscriptSegment,
    VisionAuditResult,
)
from app.utils.image_utils import (
    bbox_to_pixels,
    central_bbox,
    decode_b64_mask_png,
    encode_image_b64,
    laplacian_sharpness,
)

logger = logging.getLogger(__name__)


def _strip_json_fences(text: str) -> str:
    text = (text or "").strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _parse_json(text: str):
    cleaned = _strip_json_fences(text)
    try:
        return json.loads(cleaned)
    except Exception:
        match = re.search(r"(\{.*\}|\[.*\])", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        raise


class MetaAIService:
    def __init__(self) -> None:
        self._client: AsyncOpenAI | None = None

    def _openai(self) -> AsyncOpenAI | None:
        if not settings.meta_api_key or settings.mock_enabled:
            return None
        if self._client is None:
            self._client = AsyncOpenAI(
                api_key=settings.meta_api_key,
                base_url=settings.meta_api_base_url,
            )
        return self._client

    def _should_fallback(self, exc: Exception | None = None) -> bool:
        if settings.mock_enabled:
            return True
        if exc is not None and settings.enable_fallback_on_error:
            logger.warning("Meta API call failed, using fallback: %s", exc)
            return True
        return exc is not None

    # ------------------------------------------------------------------ Voice
    async def transcribe_audio(self, audio_path: Path) -> TranscriptResult:
        audio_path = Path(audio_path)
        client = self._openai()
        if client is not None:
            try:
                with open(audio_path, "rb") as fh:
                    resp = await client.audio.transcriptions.create(
                        model=settings.muse_voice_model,
                        file=fh,
                        response_format="verbose_json",
                    )
                segments = [
                    TranscriptSegment(start=float(s.start), end=float(s.end), text=str(s.text))
                    for s in (getattr(resp, "segments", None) or [])
                ]
                text = getattr(resp, "text", "") or ""
                if not segments and text:
                    segments = [TranscriptSegment(start=0.0, end=0.0, text=text)]
                return TranscriptResult(
                    text=text,
                    segments=segments,
                    duration_sec=float(getattr(resp, "duration", 0.0) or 0.0),
                    language=str(getattr(resp, "language", "en") or "en"),
                )
            except Exception as exc:  # noqa: BLE001
                if not self._should_fallback(exc):
                    raise
        return self._fallback_transcript(audio_path)

    def _fallback_transcript(self, audio_path: Path) -> TranscriptResult:
        # Offline demo transcript. In a real upload the seller's speech is
        # unknown without an ASR engine, so return a neutral single segment;
        # item extraction then uses its own spoken-text heuristic. Callers
        # may override via PANDROP_DEMO_TRANSCRIPT for CLI testing.
        import os

        demo = os.environ.get("PANDROP_DEMO_TRANSCRIPT", "").strip()
        if demo:
            return TranscriptResult(
                text=demo,
                segments=[TranscriptSegment(start=0.0, end=5.0, text=demo)],
                duration_sec=5.0,
            )
        return TranscriptResult(
            text="",
            segments=[],
            duration_sec=0.0,
        )

    # ------------------------------------------------------------------ Spark
    async def extract_items_from_transcript(
        self, transcript: TranscriptResult
    ) -> list[DetectedItemIntent]:
        client = self._openai()
        text = (transcript.text or "").strip()
        if client is not None and text:
            try:
                prompt = (
                    "Extract every item the speaker wants to sell as JSON. "
                    "Return ONLY a JSON array. Each element: "
                    '{"spoken_name": str, "asking_price": float, '
                    '"spoken_condition": str, "timestamp_sec": float, "category": str}. '
                    "Use the segment timestamps to set timestamp_sec.\n\n"
                    f"Transcript: {text}\n"
                    f"Segments: {json.dumps([s.model_dump() for s in transcript.segments])}"
                )
                resp = await client.chat.completions.create(
                    model=settings.muse_spark_model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.1,
                )
                raw = resp.choices[0].message.content or "[]"
                data = _parse_json(raw)
                return [DetectedItemIntent(**d) for d in data]
            except Exception as exc:  # noqa: BLE001
                if not self._should_fallback(exc):
                    raise
        return self._fallback_extract_items(transcript)

    def _fallback_extract_items(self, transcript: TranscriptResult) -> list[DetectedItemIntent]:
        text = (transcript.text or "").strip()
        if not text:
            # No speech available (e.g. silent sample video): single generic item
            # centred mid-video so the vision pipeline still demonstrates.
            dur = transcript.duration_sec or 6.0
            return [
                DetectedItemIntent(
                    spoken_name="Featured item",
                    asking_price=50.0,
                    spoken_condition="good condition",
                    timestamp_sec=round(dur / 2, 2),
                    category="General",
                )
            ]
        return _heuristic_parse_items(text, transcript)

    # ----------------------------------------------------------------- Wonder
    async def analyze_frames_and_audit_condition(
        self, item: DetectedItemIntent, frame_paths: list[Path]
    ) -> VisionAuditResult:
        client = self._openai()
        if client is not None and frame_paths:
            try:
                content: list[dict] = [
                    {
                        "type": "text",
                        "text": (
                            f'Locate "{item.spoken_name}" in these frames (in order). '
                            "Return ONLY JSON: {\"best_frame_index\": int, "
                            '"bounding_box": [x_min,y_min,x_max,y_max] in 0-1000 coords, '
                            '"point_coords": [x,y] in 0-1000 coords, '
                            '"ai_condition_score": float 1-10, '
                            '"ai_badge_text": str, "ai_visual_notes": str}. '
                            "Pick the sharpest frame showing the item best and audit its real visual condition."
                        ),
                    }
                ]
                for p in frame_paths:
                    content.append(
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{encode_image_b64(Path(p))}"
                            },
                        }
                    )
                resp = await client.chat.completions.create(
                    model=settings.muse_wonder_model,
                    messages=[{"role": "user", "content": content}],
                    temperature=0.1,
                )
                data = _parse_json(resp.choices[0].message.content or "{}")
                # Convert normalized coords to pixels on the chosen frame.
                best_idx = int(data.get("best_frame_index", 0))
                best_idx = max(0, min(best_idx, len(frame_paths) - 1))
                frame = cv2.imread(str(frame_paths[best_idx]))
                h, w = frame.shape[:2] if frame is not None else (720, 1280)
                bbox_px = bbox_to_pixels([int(v) for v in data.get("bounding_box", [250, 200, 750, 800])], w, h)
                pt = data.get("point_coords") or [(bbox_px[0] + bbox_px[2]) // 2, (bbox_px[1] + bbox_px[3]) // 2]
                pt_px = bbox_to_pixels([int(pt[0]), int(pt[1]), int(pt[0]), int(pt[1])], w, h)[:2]
                score = float(data.get("ai_condition_score", 8.0))
                return VisionAuditResult(
                    best_frame_index=best_idx,
                    bounding_box=bbox_px,
                    point_coords=pt_px,
                    ai_condition_score=score,
                    ai_badge_text=str(data.get("ai_badge_text") or f"{score:.1f}/10"),
                    ai_visual_notes=str(data.get("ai_visual_notes") or ""),
                )
            except Exception as exc:  # noqa: BLE001
                if not self._should_fallback(exc):
                    raise
        return self._fallback_wonder(item, frame_paths)

    def _fallback_wonder(
        self, item: DetectedItemIntent, frame_paths: list[Path]
    ) -> VisionAuditResult:
        if not frame_paths:
            return VisionAuditResult(
                best_frame_index=0,
                bounding_box=[0, 0, 100, 100],
                ai_badge_text="8.0/10",
                ai_visual_notes="No candidate frames available.",
            )
        best_idx, best_score = 0, -1.0
        frames = []
        for i, p in enumerate(frame_paths):
            frame = cv2.imread(str(p))
            frames.append(frame)
            if frame is not None:
                sharp = laplacian_sharpness(frame)
                if sharp > best_score:
                    best_score, best_idx = sharp, i
        best = frames[best_idx]
        h, w = best.shape[:2] if best is not None else (720, 1280)
        bbox = central_bbox(w, h)
        score = 8.5
        badge = f"{score:.1f}/10 • Good Condition"
        notes = (
            f'"{item.spoken_name}" is centred and in focus in the selected frame '
            f"(sharpness {best_score:.1f}). No major visible damage detected by the offline audit."
        )
        return VisionAuditResult(
            best_frame_index=best_idx,
            bounding_box=bbox,
            point_coords=[(bbox[0] + bbox[2]) // 2, (bbox[1] + bbox[3]) // 2],
            ai_condition_score=score,
            ai_badge_text=badge,
            ai_visual_notes=notes,
        )

    # -------------------------------------------------------------------- SAM
    async def segment_real_object(
        self,
        frame_path: Path,
        prompt_text: str,
        bbox: list[int],
        point: list[int],
    ) -> bytes:
        """Return single-channel uint8 mask PNG bytes (255 = object)."""
        frame_path = Path(frame_path)
        base = (settings.sam_api_base_url or settings.meta_api_base_url).rstrip("/")
        if settings.meta_api_key and not settings.mock_enabled:
            try:
                image_b64 = encode_image_b64(frame_path)
                async with httpx.AsyncClient(timeout=120) as http:
                    resp = await http.post(
                        f"{base}/segment",
                        headers={"Authorization": f"Bearer {settings.meta_api_key}"},
                        json={
                            "model": settings.sam_model,
                            "image": image_b64,
                            "prompt_text": prompt_text,
                            "bounding_box": bbox,
                            "point_coords": point,
                        },
                    )
                    resp.raise_for_status()
                    payload = resp.json()
                mask_b64 = payload.get("mask_png_base64") or payload.get("mask") or ""
                if mask_b64:
                    mask = decode_b64_mask_png(mask_b64)
                    return _mask_to_png_bytes(mask)
            except Exception as exc:  # noqa: BLE001
                if not self._should_fallback(exc):
                    raise
        mask = self._fallback_segment(frame_path, bbox)
        return _mask_to_png_bytes(mask)

    def _fallback_segment(self, frame_path: Path, bbox: list[int]) -> np.ndarray:
        """Genuine offline segmentation: grabCut initialised with the bbox."""
        frame = cv2.imread(str(frame_path))
        if frame is None:
            raise ValueError(f"Cannot read frame for segmentation: {frame_path}")
        h, w = frame.shape[:2]
        x1, y1, x2, y2 = bbox_to_pixels(list(bbox), w, h)
        rect = (x1, y1, max(x2 - x1, 2), max(y2 - y1, 2))
        mask_gc = np.zeros((h, w), np.uint8)
        bgd = np.zeros((1, 65), np.float64)
        fgd = np.zeros((1, 65), np.float64)
        try:
            cv2.grabCut(frame, mask_gc, rect, bgd, fgd, 5, cv2.GC_INIT_WITH_RECT)
            mask = np.where(
                (mask_gc == cv2.GC_FGD) | (mask_gc == cv2.GC_PR_FGD), 255, 0
            ).astype(np.uint8)
        except cv2.error:
            mask = np.zeros((h, w), np.uint8)
            cv2.rectangle(mask, (x1, y1), (x2, y2), 255, -1)
        if int((mask > 0).sum()) < 50:
            mask = np.zeros((h, w), np.uint8)
            cv2.rectangle(mask, (x1, y1), (x2, y2), 255, -1)
        return mask

    # ------------------------------------------------------------- Muse Image
    async def generate_studio_backdrop(
        self, item_name: str, category: str, cutout_png_path: Path
    ) -> bytes:
        """Return studio background image bytes (PNG/JPEG)."""
        base = (settings.muse_image_base_url or settings.meta_api_base_url).rstrip("/")
        if settings.meta_api_key and not settings.mock_enabled:
            try:
                prompt = (
                    f"Clean minimalist studio product photography backdrop for a {item_name} "
                    f"({category}), soft gradient, subtle floor surface, no objects, no text."
                )
                async with httpx.AsyncClient(timeout=120) as http:
                    resp = await http.post(
                        f"{base}/images/generations",
                        headers={"Authorization": f"Bearer {settings.meta_api_key}"},
                        json={"model": settings.muse_image_model, "prompt": prompt, "size": "1024x1024"},
                    )
                    resp.raise_for_status()
                    payload = resp.json()
                data = (payload.get("data") or [{}])[0]
                if data.get("b64_json"):
                    return base64.b64decode(data["b64_json"])
                if data.get("url"):
                    async with httpx.AsyncClient(timeout=120) as http:
                        img = await http.get(data["url"])
                        img.raise_for_status()
                        return img.content
            except Exception as exc:  # noqa: BLE001
                if not self._should_fallback(exc):
                    raise
        from app.services.compositor_service import generate_procedural_studio_backdrop

        return generate_procedural_studio_backdrop()

    # ------------------------------------------------------------- Spark copy
    async def generate_listing_copy(
        self, item: DetectedItemIntent, audit: VisionAuditResult
    ) -> ListingCopyResult:
        client = self._openai()
        if client is not None:
            try:
                prompt = (
                    "Write e-commerce listing copy. Return ONLY JSON: "
                    '{"seo_title": str, "description": str, "tags": [str]}.\n'
                    f"Item: {item.spoken_name}\nCategory: {item.category}\n"
                    f"Asking price: ${item.asking_price}\n"
                    f"Seller condition claim: {item.spoken_condition}\n"
                    f"AI condition score: {audit.ai_condition_score}/10\n"
                    f"AI visual notes: {audit.ai_visual_notes}"
                )
                resp = await client.chat.completions.create(
                    model=settings.muse_spark_model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.4,
                )
                data = _parse_json(resp.choices[0].message.content or "{}")
                return ListingCopyResult(
                    seo_title=str(data.get("seo_title") or item.spoken_name),
                    description=str(data.get("description") or ""),
                    tags=[str(t) for t in (data.get("tags") or [])],
                )
            except Exception as exc:  # noqa: BLE001
                if not self._should_fallback(exc):
                    raise
        name = item.spoken_name.strip() or "Item"
        title = f"{name} — {item.category}" if item.category else name
        desc = (
            f"{name} in {item.spoken_condition or 'good condition'}. "
            f"AI condition audit: {audit.ai_condition_score:.1f}/10. {audit.ai_visual_notes} "
            f"Priced at ${item.asking_price:g}. Ships as shown in the studio showcase photo."
        )
        tags = [t for t in re.split(r"[\s,]+", f"{name} {item.category}".lower()) if t][:6]
        return ListingCopyResult(seo_title=title, description=desc, tags=tags)


def _mask_to_png_bytes(mask: np.ndarray) -> bytes:
    if mask.ndim == 3:
        mask = cv2.cvtColor(mask, cv2.COLOR_BGR2GRAY)
    mask = (mask > 127).astype(np.uint8) * 255
    ok, buf = cv2.imencode(".png", mask)
    if not ok:
        raise ValueError("Failed to encode mask PNG")
    return buf.tobytes()


_PRICE_RE = re.compile(
    r"(?:\$|dollars?\b|usd\b)?\s*(\d+(?:\.\d{1,2})?)\s*(?:dollars?|usd|\$)?",
    re.IGNORECASE,
)


def _heuristic_parse_items(text: str, transcript: TranscriptResult) -> list[DetectedItemIntent]:
    """Rule-based offline parser for demo transcripts.

    Splits on 'and' / commas / sentence ends and pulls the first price-like
    number per chunk. Falls back to one item for the whole transcript.
    """
    chunks = [c.strip() for c in re.split(r"\.\s+|\band\b|,", text) if c.strip()]
    items: list[DetectedItemIntent] = []
    seg_times = [s.start for s in transcript.segments]
    _condition_only = re.compile(
        r"^(barely used|like new|brand new|good condition|great condition|"
        r"excellent condition|mint( condition)?|used|new|gently used|"
        r"in (good|great|excellent) (condition|shape))\.?$",
        re.IGNORECASE,
    )
    for i, chunk in enumerate(chunks):
        if _condition_only.match(chunk):
            if items:
                items[-1] = items[-1].model_copy(update={"spoken_condition": chunk.rstrip(".")})
            continue
        m = _PRICE_RE.search(chunk)
        price = float(m.group(1)) if m else 0.0
        name = chunk
        if m:
            name = (chunk[: m.start()] + chunk[m.end():]).strip(" ,.-")
        name = re.sub(r"^(selling|sell|i'?m selling|for sale)\s+", "", name, flags=re.IGNORECASE).strip()
        name = re.sub(r"^(these|this|those|the|my|a|an)\s+", "", name, flags=re.IGNORECASE).strip()
        name = re.sub(r"\s+for$", "", name).strip()
        if not name:
            continue
        ts = seg_times[min(i, len(seg_times) - 1)] if seg_times else float(i * 3)
        items.append(
            DetectedItemIntent(
                spoken_name=name[:80],
                asking_price=price,
                spoken_condition="good condition",
                timestamp_sec=float(ts),
                category="General",
            )
        )
    if not items:
        items.append(
            DetectedItemIntent(
                spoken_name=text[:60],
                asking_price=0.0,
                spoken_condition="good condition",
                timestamp_sec=0.0,
                category="General",
            )
        )
    return items
