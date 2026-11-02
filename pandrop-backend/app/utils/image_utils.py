"""Base64 encoding/decoding, bbox scaling and RGBA helpers."""
from __future__ import annotations

import base64
import io
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


def encode_image_b64(path: Path) -> str:
    return base64.b64encode(Path(path).read_bytes()).decode("ascii")


def encode_array_b64_png(arr: np.ndarray) -> str:
    ok, buf = cv2.imencode(".png", arr)
    if not ok:
        raise ValueError("Failed to PNG-encode array")
    return base64.b64encode(buf.tobytes()).decode("ascii")


def decode_b64_image(data: str) -> np.ndarray:
    """Decode base64 image bytes -> BGR ndarray."""
    raw = base64.b64decode(data)
    arr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError("Failed to decode base64 image")
    return img


def decode_b64_mask_png(data: str) -> np.ndarray:
    img = decode_b64_image(data)
    if img.ndim == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return (img > 127).astype(np.uint8) * 255


def bbox_to_pixels(bbox: list[int], width: int, height: int) -> list[int]:
    """Accept normalized 0-1000 or pixel coords; always return clamped pixels."""
    if len(bbox) != 4:
        return [0, 0, width, height]
    x1, y1, x2, y2 = [int(v) for v in bbox]
    if max(abs(x1), abs(y1), abs(x2), abs(y2)) <= 1000 and (x2 <= 1000 and y2 <= 1000):
        # Heuristic: values that fit 0-1000 and image is larger -> normalized.
        if width > 1000 or height > 1000 or x2 > width or y2 > height:
            x1 = int(x1 / 1000 * width)
            y1 = int(y1 / 1000 * height)
            x2 = int(x2 / 1000 * width)
            y2 = int(y2 / 1000 * height)
    x1 = max(0, min(x1, width - 1))
    y1 = max(0, min(y1, height - 1))
    x2 = max(x1 + 1, min(x2, width))
    y2 = max(y1 + 1, min(y2, height))
    return [x1, y1, x2, y2]


def bbox_center(bbox: list[int]) -> list[int]:
    return [(bbox[0] + bbox[2]) // 2, (bbox[1] + bbox[3]) // 2]


def central_bbox(width: int, height: int, frac_w: float = 0.55, frac_h: float = 0.55) -> list[int]:
    w = int(width * frac_w)
    h = int(height * frac_h)
    x1 = (width - w) // 2
    y1 = (height - h) // 2
    return [x1, y1, x1 + w, y1 + h]


def laplacian_sharpness(frame_bgr: np.ndarray) -> float:
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def ensure_rgba(img: Image.Image) -> Image.Image:
    return img.convert("RGBA")


def pil_to_bytes(img: Image.Image, fmt: str = "PNG") -> bytes:
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


def bytes_to_pil(data: bytes) -> Image.Image:
    return Image.open(io.BytesIO(data)).convert("RGBA")


def save_bgr(path: Path, frame_bgr: np.ndarray) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(path), frame_bgr):
        raise IOError(f"Failed to write image: {path}")
    return path


def format_price(amount: float) -> str:
    if amount == int(amount):
        return f"${int(amount)}"
    return f"${amount:.2f}"
