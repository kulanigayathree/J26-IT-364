"""C1 adapter: reads model_outputs/c1/anomalies.json."""

from datetime import datetime, timedelta

from app.adapters import load_output
from app.schemas.c1 import C1Data, C1Summary


def _time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def get_data() -> C1Data:
    raw, is_sample = load_output("c1", "anomalies.json")
    anomalies = sorted(raw["anomalies"], key=lambda a: a["time"], reverse=True)
    # "today" = the 24 h before the model run, so the number stays meaningful for older files
    day_start = _time(raw["generated_at"]) - timedelta(hours=24)
    summary = C1Summary(
        anomalies_today=sum(1 for a in anomalies if _time(a["time"]) >= day_start),
        high_severity=sum(1 for a in anomalies if a["severity"] == "high"),
        vessels_tracked=len(raw["vessels"]),
        total_anomalies=len(anomalies),
    )
    return C1Data(
        model_name=raw["model_name"],
        model_version=raw["model_version"],
        generated_at=raw["generated_at"],
        is_sample=is_sample,
        summary=summary,
        vessels=raw["vessels"],
        anomalies=anomalies,
    )
