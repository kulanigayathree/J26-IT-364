"""C4 adapter: reads model_outputs/c4/spills.json."""

from app.adapters import load_output
from app.schemas.c4 import C4Data, C4Summary


def get_data() -> C4Data:
    raw, is_sample = load_output("c4", "spills.json")
    spills = sorted(raw["spills"], key=lambda s: s["detected_at"], reverse=True)
    summary = C4Summary(
        active=sum(1 for s in spills if s["status"] == "active"),
        total=len(spills),
        high_severity=sum(1 for s in spills if s["severity"] == "high"),
        candidate_vessels=sum(len(s["candidates"]) for s in spills if s["status"] == "active"),
    )
    return C4Data(
        model_name=raw["model_name"],
        model_version=raw["model_version"],
        generated_at=raw["generated_at"],
        is_sample=is_sample,
        summary=summary,
        spills=spills,
    )
