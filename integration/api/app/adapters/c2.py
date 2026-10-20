"""C2 adapter: reads model_outputs/c2/forecast.json and ranks fishing zones per port."""

import math

from app.adapters import load_output
from app.schemas.c2 import C2Data, C2Forecast, C2Summary, C2Zones, LeadInfo, Port, Zone

PORTS = [
    Port(name="Colombo", lon=79.86, lat=6.96),
    Port(name="Negombo", lon=79.835, lat=7.21),
    Port(name="Galle", lon=80.22, lat=6.03),
    Port(name="Beruwala", lon=79.983, lat=6.479),
    Port(name="Trincomalee", lon=81.23, lat=8.57),
    Port(name="Batticaloa", lon=81.7, lat=7.71),
]
DEFAULT_PORT = "Colombo"
DEFAULT_FUEL_L_PER_KM = 2.5
DEFAULT_FUEL_PRICE = 300.0


def find_port(name: str) -> Port | None:
    return next((p for p in PORTS if p.name.lower() == name.lower()), None)


def haversine_km(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _load() -> tuple[dict, dict]:
    raw, is_sample = load_output("c2", "forecast.json")
    meta = {
        "model_name": raw["model_name"],
        "model_version": raw["model_version"],
        "generated_at": raw["generated_at"],
        "is_sample": is_sample,
    }
    return raw, meta


def _lead(raw: dict, lead: int) -> dict:
    data = raw["leads"].get(str(lead))
    if data is None:
        raise KeyError(f"No forecast for day {lead}.")
    return data


def rank_zones(raw: dict, lead: int, port: Port, fuel_l_per_km: float, fuel_price: float,
               limit: int = 10, max_km: float | None = None) -> list[Zone]:
    data = _lead(raw, lead)
    lats, lons = raw["grid"]["lat"], raw["grid"]["lon"]
    cells = []
    for i, lat in enumerate(lats):
        for j, lon in enumerate(lons):
            p = data["probability"][i][j]
            if p is None:
                continue
            km = 2 * haversine_km(port.lon, port.lat, lon, lat)  # return trip
            if max_km is not None and km > max_km:
                continue
            cells.append((p, data["uncertainty"][i][j] or 0.0, lat, lon, km))
    cells.sort(key=lambda c: (-c[0], c[4]))
    return [
        Zone(
            rank=n + 1,
            lat=lat,
            lon=lon,
            probability=p,
            uncertainty=u,
            distance_km=round(km, 1),
            fuel_litres=round(km * fuel_l_per_km, 1),
            fuel_cost_rs=round(km * fuel_l_per_km * fuel_price),
        )
        for n, (p, u, lat, lon, km) in enumerate(cells[:limit])
    ]


def get_data() -> C2Data:
    raw, meta = _load()
    port = find_port(DEFAULT_PORT)
    best = rank_zones(raw, 1, port, DEFAULT_FUEL_L_PER_KM, DEFAULT_FUEL_PRICE, limit=1)[0]
    return C2Data(
        **meta,
        issued_date=raw["issued_date"],
        leads=[LeadInfo(lead=int(k), date=v["date"]) for k, v in sorted(raw["leads"].items())],
        ports=PORTS,
        summary=C2Summary(
            port=port.name,
            best_probability=best.probability,
            best_lat=best.lat,
            best_lon=best.lon,
            distance_km=best.distance_km,
        ),
    )


def get_forecast(lead: int) -> C2Forecast:
    raw, meta = _load()
    data = _lead(raw, lead)
    lats = raw["grid"]["lat"]
    return C2Forecast(
        **meta,
        lead=lead,
        date=data["date"],
        lat=lats,
        lon=raw["grid"]["lon"],
        cell_size=round(abs(lats[1] - lats[0]), 4) if len(lats) > 1 else 0.25,
        probability=data["probability"],
        uncertainty=data["uncertainty"],
    )


def get_zones(lead: int, port: Port, fuel_l_per_km: float, fuel_price: float, max_km: float | None) -> C2Zones:
    raw, meta = _load()
    return C2Zones(
        **meta,
        lead=lead,
        date=_lead(raw, lead)["date"],
        port=port,
        fuel_l_per_km=fuel_l_per_km,
        fuel_price=fuel_price,
        zones=rank_zones(raw, lead, port, fuel_l_per_km, fuel_price, max_km=max_km),
    )
