"""Application settings loaded from environment / .env via pydantic-settings."""
from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Meta Model API
    meta_api_key: str = ""
    meta_api_base_url: str = "https://api.meta.ai/v1"
    muse_voice_model: str = "muse-voice-transcribe"
    muse_spark_model: str = "muse-spark"
    muse_wonder_model: str = "muse-wonder"
    sam_model: str = "sam-3.1"
    muse_image_model: str = "muse-image"

    fireworks_api_key: str = ""
    baseten_api_key: str = ""
    sam_api_base_url: str = ""
    muse_image_base_url: str = ""

    # Behaviour flags (both spellings accepted; use_mock_ai wins when set)
    use_mock_ai: bool = True
    use_mock_models: bool = True
    enable_fallback_on_error: bool = True

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    static_dir: str = "static"
    max_upload_mb: int = 200
    frame_window_sec: float = 1.5
    candidate_frames_per_item: int = 3

    @property
    def static_path(self) -> Path:
        p = Path(self.static_dir)
        if not p.is_absolute():
            p = BASE_DIR / p
        return p

    @property
    def jobs_path(self) -> Path:
        return self.static_path / "jobs"

    @property
    def mock_enabled(self) -> bool:
        return bool(self.use_mock_ai or self.use_mock_models or not self.meta_api_key)


settings = Settings()
