"""C3 adapter: reads model_outputs/c3/reefs.json."""

from app.adapters import load_output
from app.schemas.c3 import C3Data, C3Summary, Reef


def get_data() -> C3Data:
    raw, is_sample = load_output("c3", "reefs.json")
    reefs = []
    for r in raw["reefs"]:
        monthly = sorted(r["monthly"], key=lambda m: m["month"])
        latest = monthly[-1] if monthly else {"month": "", "cover": {}}
        reefs.append(Reef(**r, latest_month=latest["month"], latest_cover=latest["cover"]))

    coral = [r.latest_cover["Coral"] for r in reefs if "Coral" in r.latest_cover]
    summary = C3Summary(
        reefs_total=len(reefs),
        at_risk=sum(1 for r in reefs if r.status == "at_risk"),
        watch=sum(1 for r in reefs if r.status == "watch"),
        mean_coral=round(sum(coral) / len(coral), 1) if coral else None,
    )
    return C3Data(
        model_name=raw["model_name"],
        model_version=raw["model_version"],
        generated_at=raw["generated_at"],
        is_sample=is_sample,
        classes=raw["classes"],
        summary=summary,
        reefs=reefs,
    )
