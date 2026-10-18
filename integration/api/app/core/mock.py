"""Loads the sample data in app/mock/<component>/ until the models and PostGIS are connected.

The same files are copied to frontend/src/features/<component>/mock/ so the app also works when
the API is not running. If you change a mock file, change both copies.
"""

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

MOCK_DIR = Path(__file__).resolve().parent.parent / "mock"


@lru_cache(maxsize=64)
def load_mock(component: str, name: str) -> Any:
    path = MOCK_DIR / component / name
    with path.open(encoding="utf-8") as f:
        return json.load(f)
