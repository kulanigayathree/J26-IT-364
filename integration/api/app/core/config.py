"""Settings read from environment variables (no extra dependencies)."""

import os

DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173,http://127.0.0.1:5173,"  # vite dev server
    "http://localhost:4173,http://127.0.0.1:4173"  # vite preview
)


class Settings:
    def __init__(self) -> None:
        origins = os.environ.get("CORS_ORIGINS", DEFAULT_CORS_ORIGINS)
        self.cors_origins: list[str] = [o.strip() for o in origins.split(",") if o.strip()]
        # TODO: add DATABASE_URL here when the PostGIS layer is built.


settings = Settings()
