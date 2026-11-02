"""FFmpeg audio extraction & frame sampling with OpenCV fallback."""
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import cv2

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".webm"}


def validate_video_file(filename: str) -> None:
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported video type '{suffix}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}")


def _run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, timeout=300)


def has_ffmpeg() -> bool:
    return shutil.which("ffmpeg") is not None


def probe_video(video_path: Path) -> dict:
    """Return {duration_sec, fps, width, height}. Uses ffprobe when present, else OpenCV."""
    video_path = Path(video_path)
    if shutil.which("ffprobe"):
        try:
            result = _run([
                "ffprobe", "-v", "quiet", "-print_format", "json",
                "-show_format", "-show_streams", str(video_path),
            ])
            if result.returncode == 0:
                data = json.loads(result.stdout or "{}")
                duration = float(data.get("format", {}).get("duration", 0) or 0)
                width = height = 0
                fps = 0.0
                for stream in data.get("streams", []):
                    if stream.get("codec_type") == "video":
                        width = int(stream.get("width", 0) or 0)
                        height = int(stream.get("height", 0) or 0)
                        rate = stream.get("avg_frame_rate", "0/1") or "0/1"
                        try:
                            num, den = rate.split("/")
                            fps = float(num) / float(den) if float(den) else 0.0
                        except Exception:
                            fps = 0.0
                        break
                if duration > 0:
                    return {"duration_sec": duration, "fps": fps, "width": width, "height": height}
        except Exception:
            pass
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ValueError(f"Cannot open video file: {video_path}")
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
    frames = float(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0.0)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    cap.release()
    duration = (frames / fps) if fps > 0 else 0.0
    return {"duration_sec": duration, "fps": fps, "width": width, "height": height}


def extract_audio(video_path: Path, out_path: Path) -> Path:
    """Extract audio to .wav (preferred) — ffmpeg first, graceful no-audio fallback."""
    video_path, out_path = Path(video_path), Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if has_ffmpeg():
        result = _run([
            "ffmpeg", "-y", "-i", str(video_path),
            "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", str(out_path),
        ])
        if result.returncode == 0 and out_path.exists() and out_path.stat().st_size > 0:
            return out_path
    # Fallback: many test videos have no audio track. Create a silent wav so
    # downstream transcription can still run in fallback mode.
    _write_silent_wav(out_path)
    return out_path


def _write_silent_wav(path: Path, seconds: float = 1.0, rate: int = 16000) -> None:
    import struct
    import wave

    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(rate)
        wf.writeframes(b"\x00\x00" * int(rate * seconds))


def extract_frame_at(video_path: Path, timestamp_sec: float, out_path: Path):
    """Extract a single frame. Returns BGR ndarray or None."""
    video_path, out_path = Path(video_path), Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return None
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 30.0)
    total = float(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0.0)
    duration = (total / fps) if fps else 0.0
    ts = max(0.0, min(float(timestamp_sec), max(duration - 0.05, 0.0)))
    cap.set(cv2.CAP_PROP_POS_MSEC, ts * 1000.0)
    ok, frame = cap.read()
    cap.release()
    if not ok or frame is None:
        return None
    cv2.imwrite(str(out_path), frame)
    return frame


def extract_candidate_frames(
    video_path: Path,
    timestamp_sec: float,
    out_dir: Path,
    window_sec: float = 1.5,
    count: int = 3,
) -> list[Path]:
    """Sample `count` frames spread across [ts-window, ts+window]."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    if count <= 1:
        offsets = [0.0]
    else:
        offsets = [-window_sec + (2 * window_sec) * i / (count - 1) for i in range(count)]
    paths: list[Path] = []
    for i, off in enumerate(offsets):
        out = out_dir / f"candidate_{i}.jpg"
        frame = extract_frame_at(video_path, timestamp_sec + off, out)
        if frame is not None:
            paths.append(out)
    return paths
