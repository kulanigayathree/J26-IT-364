from typing import Literal

from pydantic import BaseModel

Severity = Literal["low", "medium", "high"]


class ModelMeta(BaseModel):
    """Every /data response starts with this, so pages can show 'Model: …, updated …'."""

    model_name: str
    model_version: str
    generated_at: str  # ISO 8601 UTC
    is_sample: bool  # True when the real model output file is missing
