"""Real-object cutout & studio showcase compositor (OpenCV + Pillow).

Signature visual feature: SAM mask -> HUD overlay, transparent RGBA cutout
of the *real* object, and a 1024x1024 studio showcase card (+ price-tagged
variant).
"""
from __future__ import annotations

import io
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

NEON = (0, 255, 200)  # BGR emerald/cyan
NEON_RGB = (0, 230, 180)


def _load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for candidate in ("arialbd.ttf", "arial.ttf", "DejaVuSans-Bold.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(candidate, size)
        except Exception:
            continue
    return ImageFont.load_default()


def _mask_u8(mask: np.ndarray) -> np.ndarray:
    if mask.ndim == 3:
        mask = cv2.cvtColor(mask, cv2.COLOR_BGR2GRAY)
    return (mask > 127).astype(np.uint8) * 255


def decode_mask_bytes(mask_png_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(mask_png_bytes, dtype=np.uint8)
    mask = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
    if mask is None:
        raise ValueError("Failed to decode mask bytes")
    return _mask_u8(mask)


# ----------------------------------------------------------------- HUD overlay
def create_hud_overlay(
    frame_bgr: np.ndarray,
    mask: np.ndarray,
    bbox: list[int],
    label: str,
    price_str: str,
    out_path: Path,
) -> Path:
    """Glowing mask overlay + corner brackets + floating HUD label."""
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    frame = frame_bgr.copy()
    h, w = frame.shape[:2]
    m = _mask_u8(mask)
    if m.shape[:2] != (h, w):
        m = cv2.resize(m, (w, h), interpolation=cv2.INTER_NEAREST)

    # Semi-transparent neon fill where mask is set.
    overlay = frame.copy()
    overlay[m > 0] = NEON
    frame = cv2.addWeighted(frame, 0.62, overlay, 0.38, 0)

    # Glow edge.
    edges = cv2.Canny(m, 80, 200)
    glow = cv2.dilate(edges, np.ones((3, 3), np.uint8))
    frame[glow > 0] = NEON

    # Corner targeting brackets.
    x1, y1, x2, y2 = [int(v) for v in bbox]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w - 1, x2), min(h - 1, y2)
    arm = max(18, min(48, (x2 - x1) // 6))
    thick = 3
    for (cx, cy, dx, dy) in (
        (x1, y1, 1, 1), (x2, y1, -1, 1), (x1, y2, 1, -1), (x2, y2, -1, -1)
    ):
        cv2.line(frame, (cx, cy), (cx + dx * arm, cy), NEON, thick)
        cv2.line(frame, (cx, cy), (cx, cy + dy * arm), NEON, thick)

    # HUD label pill via Pillow for clean text.
    pil = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(pil)
    text = f"{label} • {price_str}"
    font = _load_font(30)
    tb = draw.textbbox((0, 0), text, font=font)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    lx = max(8, min(x1, w - tw - 32))
    ly = max(8, y1 - th - 28)
    draw.rounded_rectangle([lx, ly, lx + tw + 24, ly + th + 18], radius=12, fill=(10, 24, 24))
    draw.rounded_rectangle([lx, ly, lx + tw + 24, ly + th + 18], radius=12, outline=NEON_RGB, width=2)
    draw.text((lx + 12, ly + 8), text, font=font, fill=(235, 255, 250))

    pil.save(str(out_path))
    return out_path


# -------------------------------------------------------------------- cutout
def extract_real_object_cutout(
    frame_bgr: np.ndarray,
    mask: np.ndarray,
    bbox: list[int],
    out_path: Path,
    pad_frac: float = 0.08,
) -> Path:
    """RGBA cutout of the real object, tightly cropped with 8% padding."""
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    h, w = frame_bgr.shape[:2]
    m = _mask_u8(mask)
    if m.shape[:2] != (h, w):
        m = cv2.resize(m, (w, h), interpolation=cv2.INTER_NEAREST)

    # Smooth edges: close small holes, open speckle, then feather.
    kernel = np.ones((5, 5), np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, kernel)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    alpha = cv2.GaussianBlur(m, (5, 5), 0)

    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    rgba = np.dstack([rgb, alpha])

    ys, xs = np.where(alpha > 10)
    if len(xs) == 0:
        x1, y1, x2, y2 = [int(v) for v in bbox]
    else:
        x1, x2 = int(xs.min()), int(xs.max()) + 1
        y1, y2 = int(ys.min()), int(ys.max()) + 1
    pad_x = int((x2 - x1) * pad_frac)
    pad_y = int((y2 - y1) * pad_frac)
    x1, y1 = max(0, x1 - pad_x), max(0, y1 - pad_y)
    x2, y2 = min(w, x2 + pad_x), min(h, y2 + pad_y)
    cropped = rgba[y1:y2, x1:x2]

    Image.fromarray(cropped, mode="RGBA").save(str(out_path))
    return out_path


# -------------------------------------------------------------- studio backdrop
def generate_procedural_studio_backdrop(size: int = 1024) -> bytes:
    """Sleek radial-gradient studio backdrop with a soft floor horizon."""
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    cx, cy = size * 0.5, size * 0.42
    dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / (size * 0.75)
    dist = np.clip(dist, 0, 1)
    top = np.array([245, 247, 250], dtype=np.float32)
    edge = np.array([196, 205, 218], dtype=np.float32)
    img = (top[None, None, :] * (1 - dist[..., None]) + edge[None, None, :] * dist[..., None])
    # Floor: slightly darker below horizon with a soft blend.
    horizon = int(size * 0.78)
    floor = np.array([176, 188, 204], dtype=np.float32)
    blend = np.clip((yy - horizon) / (size * 0.08), 0, 1)
    img = img * (1 - blend[..., None] * 0.65) + floor[None, None, :] * (blend[..., None] * 0.65)
    # Vignette.
    vig = 1 - 0.12 * ((xx / size - 0.5) ** 2 + (yy / size - 0.5) ** 2) * 4
    img = np.clip(img * vig[..., None], 0, 255).astype(np.uint8)
    pil = Image.fromarray(img, mode="RGB")
    # Soft horizon glow line.
    draw = ImageDraw.Draw(pil, "RGBA")
    draw.line([(0, horizon), (size, horizon)], fill=(255, 255, 255, 90), width=3)
    buf = io.BytesIO()
    pil.save(buf, format="PNG")
    return buf.getvalue()


def _load_background(studio_bg_bytes: bytes | None, size: int = 1024) -> Image.Image:
    if studio_bg_bytes:
        try:
            bg = Image.open(io.BytesIO(studio_bg_bytes)).convert("RGB")
            return bg.resize((size, size), Image.LANCZOS)
        except Exception:
            pass
    return Image.open(io.BytesIO(generate_procedural_studio_backdrop(size))).convert("RGB")


def _draw_pill(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    font,
    fill: tuple[int, int, int],
    text_fill: tuple[int, int, int] = (255, 255, 255),
    pad_x: int = 22,
    pad_y: int = 12,
) -> tuple[int, int, int, int]:
    tb = draw.textbbox((0, 0), text, font=font)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    x, y = xy
    box = (x, y, x + tw + pad_x * 2, y + th + pad_y * 2)
    draw.rounded_rectangle(box, radius=(box[3] - box[1]) // 2, fill=fill)
    draw.text((x + pad_x, y + pad_y - tb[1]), text, font=font, fill=text_fill)
    return box


# --------------------------------------------------------------- showcase card
def create_studio_showcase(
    real_cutout_path: Path,
    studio_bg_bytes: bytes | None,
    price_formatted: str,
    seo_title: str,
    condition_badge: str,
    out_clean_path: Path,
    out_tagged_path: Path,
) -> tuple[Path, Path]:
    """Composite cutout onto 1024x1024 studio bg; save clean + price-tagged."""
    out_clean_path, out_tagged_path = Path(out_clean_path), Path(out_tagged_path)
    out_clean_path.parent.mkdir(parents=True, exist_ok=True)
    size = 1024
    bg = _load_background(studio_bg_bytes, size).convert("RGBA")
    cutout = Image.open(real_cutout_path).convert("RGBA")

    # Scale longest side to 72% of canvas.
    target = int(size * 0.72)
    cw, ch = cutout.size
    scale = target / max(cw, ch)
    new_size = (max(1, int(cw * scale)), max(1, int(ch * scale)))
    cutout = cutout.resize(new_size, Image.LANCZOS)
    px = (size - new_size[0]) // 2
    py = int(size * 0.46 - new_size[1] / 2)

    canvas = bg.copy()

    # Contact shadow: blurred dark ellipse under the object + soft drop shadow.
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    foot_y = py + new_size[1]
    sdraw.ellipse(
        [px + new_size[0] * 0.12, foot_y - 26, px + new_size[0] * 0.88, foot_y + 30],
        fill=(0, 0, 0, 110),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    canvas = Image.alpha_composite(canvas, shadow)

    drop = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    drop.paste((0, 0, 0, 90), (px + 10, py + 14), cutout.split()[3])
    drop = drop.filter(ImageFilter.GaussianBlur(10))
    canvas = Image.alpha_composite(canvas, drop)
    canvas.alpha_composite(cutout, (px, py))

    canvas.convert("RGB").save(str(out_clean_path))

    # Tagged variant: price pill bottom-right, condition badge top-left.
    tagged = canvas.copy()
    draw = ImageDraw.Draw(tagged)
    price_font = _load_font(44)
    tb = draw.textbbox((0, 0), price_formatted, font=price_font)
    pw = (tb[2] - tb[0]) + 44
    _draw_pill(draw, (size - pw - 36, size - 118), price_formatted, price_font, fill=(12, 18, 20))
    badge_font = _load_font(26)
    _draw_pill(
        draw, (32, 32), condition_badge, badge_font,
        fill=(235, 245, 242), text_fill=(14, 60, 50),
    )
    tagged.convert("RGB").save(str(out_tagged_path))
    return out_clean_path, out_tagged_path
