"""Adapters are the ONLY code that reads model outputs (integration/model_outputs/cX/*.json).

If the real file is missing, the sample file is used and `is_sample` is True.
See integration/MODEL_OUTPUTS.md for the formats.
"""

import json
import os
from pathlib import Path

OUTPUTS_DIR = Path(os.environ.get("MODEL_OUTPUTS_DIR", Path(__file__).resolve().parents[3] / "model_outputs"))


def load_output(component: str, filename: str) -> tuple[dict, bool]:
    """Return (data, is_sample) for e.g. load_output("c1", "anomalies.json")."""
    real = OUTPUTS_DIR / component / filename
    path = real if real.exists() else OUTPUTS_DIR / component / f"sample_{filename}"
    with path.open(encoding="utf-8") as f:
        return json.load(f), path != real
