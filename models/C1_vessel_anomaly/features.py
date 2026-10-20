"""Loading, cleaning, feature engineering and windowing of AIS tracks.

Latitude / longitude are NOT model inputs. They are only used to derive physical
quantities (implied speed between pings) and, later, for geofencing. So the model
learns vessel *dynamics* and does not care which ocean the data came from.
"""
import numpy as np
import pandas as pd
import yaml

STD_COLS = ["mmsi", "time", "lat", "lon", "sog", "cog"]
FEATURES = ["log_dt", "sog", "cog_sin", "cog_cos", "rot", "accel", "implied_kn"]
EARTH_RADIUS_NM = 3440.065
ANOM_CODES = {"": 0, "spoof": 1, "gap": 2, "slowdown": 3, "zigzag": 4}
ANOM_NAMES = {v: k for k, v in ANOM_CODES.items()}


def load_config(path):
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def inspect_csv(csv_path, n=5):
    df = pd.read_csv(csv_path, nrows=n)
    print("Columns in your CSV:")
    for c in df.columns:
        print("  -", c)
    print(df.head(n).to_string())


def _find_col(raw, name):
    """Exact match first, then case-insensitive (so 'SOG' also finds 'sog')."""
    if name in raw.columns:
        return name
    lower = {c.lower(): c for c in raw.columns}
    return lower.get(str(name).lower())


def load_tracks(csv_path, cfg):
    """Reads the CSV in chunks (only the needed columns) so big files do not exhaust memory.
    data.max_vessels keeps the first N distinct vessels found; null = keep all."""
    cols = {k: v for k, v in cfg["columns"].items() if v}
    d = cfg["data"]
    header = pd.read_csv(csv_path, nrows=0)

    geom = cols.pop("geometry", None)        # coordinates stored as WKT text: POINT (lon lat)
    g = None
    if geom:
        g = _find_col(header, geom)
        if g is None:
            raise SystemExit(f"geometry column '{geom}' not found. CSV has: {list(header.columns)}")
        cols.pop("lat", None)
        cols.pop("lon", None)

    resolved, missing = {}, []
    for std, name in cols.items():
        real = _find_col(header, name)
        if real is None:
            missing.append(name)
        else:
            resolved[std] = real
    need = set(STD_COLS) - set(resolved) - ({"lat", "lon"} if g else set())
    if missing or need:
        raise SystemExit(
            f"Could not find these columns in the CSV: {missing or sorted(need)}\n"
            f"CSV has: {list(header.columns)}\nFix the 'columns:' section of c1_config.yaml."
        )
    vt_col = None
    if d.get("vessel_types") and d.get("vessel_type_column"):
        vt_col = _find_col(header, d["vessel_type_column"])
        if vt_col is None:
            raise SystemExit(f"vessel_type_column '{d['vessel_type_column']}' not found in the CSV.")

    usecols = list(dict.fromkeys(list(resolved.values()) + ([g] if g else []) + ([vt_col] if vt_col else [])))
    mmsi_col, maxv = resolved["mmsi"], d.get("max_vessels")
    parts, chosen = [], set()
    for chunk in pd.read_csv(csv_path, usecols=usecols, chunksize=500000, nrows=d.get("nrows")):
        if vt_col:
            chunk = chunk[chunk[vt_col].isin(d["vessel_types"])]
        if maxv:
            for v in chunk[mmsi_col].dropna().unique():
                if len(chosen) >= maxv:
                    break
                chosen.add(v)
            chunk = chunk[chunk[mmsi_col].isin(chosen)]
        parts.append(chunk)
    raw = pd.concat(parts, ignore_index=True)

    if g:
        xy = raw[g].astype(str).str.extract(r"POINT\s*(?:Z|M|ZM)?\s*\(\s*(-?[\d.eE+-]+)\s+(-?[\d.eE+-]+)")
        raw["__lon"] = pd.to_numeric(xy[0], errors="coerce")
        raw["__lat"] = pd.to_numeric(xy[1], errors="coerce")
        resolved["lon"], resolved["lat"] = "__lon", "__lat"
    df = raw.rename(columns={v: k for k, v in resolved.items()})[STD_COLS].copy()
    return clean_and_segment(df, d)


def clean_and_segment(df, d):
    t = df["time"]
    if pd.api.types.is_numeric_dtype(t):            # unix epoch numbers (seconds or milliseconds)
        unit = "ms" if t.dropna().median() > 1e11 else "s"
        df["time"] = pd.to_datetime(t, unit=unit, utc=True, errors="coerce")
    else:
        df["time"] = pd.to_datetime(t, utc=True, errors="coerce")
    for c in ["mmsi", "lat", "lon", "sog", "cog"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df = df.dropna(subset=STD_COLS)
    df["mmsi"] = df["mmsi"].astype("int64")
    df = df[(df.lat.between(-90, 90)) & (df.lon.between(-180, 180))]
    df = df[(df.sog >= 0) & (df.sog <= 102.2)]       # 102.3 = "not available" in AIS
    df = df[(df.cog >= 0) & (df.cog < 360)]          # 360 = "not available"
    df = df.drop_duplicates(subset=["mmsi", "time"]).sort_values(["mmsi", "time"])
    df = df.reset_index(drop=True)

    gap = df.groupby("mmsi")["time"].diff().dt.total_seconds()
    new_seg = (gap.isna()) | (gap > d["max_gap_hours"] * 3600)
    df["track_id"] = new_seg.cumsum().astype(int)
    sizes = df.groupby("track_id")["track_id"].transform("size")
    df = df[sizes >= d["min_track_pings"]].reset_index(drop=True)
    df["anom"] = 0
    df["anom_type"] = ""
    return df


def split_by_mmsi(df, frac, seed):
    """Returns three dataframes (train, val, test) with disjoint vessels."""
    rng = np.random.default_rng(seed)
    mmsis = df["mmsi"].unique()
    rng.shuffle(mmsis)
    n = len(mmsis)
    n_tr = int(frac["train"] * n)
    n_va = int(frac["val"] * n)
    sets = (mmsis[:n_tr], mmsis[n_tr:n_tr + n_va], mmsis[n_tr + n_va:])
    return tuple(df[df["mmsi"].isin(s)].reset_index(drop=True) for s in sets)


def _haversine_nm(lat1, lon1, lat2, lon2):
    p1, p2 = np.radians(lat1), np.radians(lat2)
    dphi = p2 - p1
    dlmb = np.radians(lon2 - lon1)
    a = np.sin(dphi / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dlmb / 2) ** 2
    return 2 * EARTH_RADIUS_NM * np.arcsin(np.sqrt(np.clip(a, 0, 1)))


def _slog(x):
    return np.sign(x) * np.log1p(np.abs(x))


def compute_features(df):
    """Per-ping features. First ping of each track is dropped (no previous ping)."""
    df = df.sort_values(["track_id", "time"]).reset_index(drop=True)
    g = df.groupby("track_id", sort=False)
    dt = g["time"].diff().dt.total_seconds()
    lat_p, lon_p = g["lat"].shift(), g["lon"].shift()
    sog_p, cog_p = g["sog"].shift(), g["cog"].shift()

    dt = dt.clip(lower=1.0)
    dist = _haversine_nm(lat_p, lon_p, df["lat"], df["lon"])
    implied = dist / (dt / 3600.0)
    dcog = ((df["cog"] - cog_p + 180.0) % 360.0) - 180.0
    rot = np.clip(dcog / dt * 60.0, -720, 720)                 # deg / min
    accel = np.clip((df["sog"] - sog_p) / dt * 60.0, -100, 100)  # kn / min

    out = df.copy()
    out["dt"] = dt
    out["implied_kn_raw"] = np.clip(implied, 0, 500)
    out["rot_raw"] = rot
    out["log_dt"] = np.log1p(dt)
    out["cog_sin"] = np.sin(np.radians(df["cog"]))
    out["cog_cos"] = np.cos(np.radians(df["cog"]))
    out["rot"] = _slog(rot)
    out["accel"] = _slog(accel)
    out["implied_kn"] = np.log1p(out["implied_kn_raw"])
    out = out.dropna(subset=["dt"]).reset_index(drop=True)
    out["anom_code"] = out["anom_type"].map(ANOM_CODES).fillna(0).astype(int)
    return out


def make_windows(feat_df, size, stride):
    """Sliding windows inside each track.
    Returns X (n,size,F), R (n,size,4 raw: dt,sog,implied_kn,|rot|), y, wtype, meta."""
    Xs, Rs, ys, ts, metas = [], [], [], [], []
    for tid, g in feat_df.groupby("track_id", sort=False):
        if len(g) < size:
            continue
        f = g[FEATURES].to_numpy(np.float32)
        r = np.stack([g["dt"], g["sog"], g["implied_kn_raw"], g["rot_raw"].abs()], 1).astype(np.float32)
        a = g["anom_code"].to_numpy()
        idx = np.arange(0, len(g) - size + 1, stride)
        for i in idx:
            Xs.append(f[i:i + size])
            Rs.append(r[i:i + size])
            seg = a[i:i + size]
            ys.append(int(seg.max() > 0))
            ts.append(int(seg.max()))
            metas.append((tid, g["mmsi"].iloc[0], g["time"].iloc[i + size - 1],
                          g["lat"].iloc[i + size - 1], g["lon"].iloc[i + size - 1]))
    if not Xs:
        raise SystemExit("No windows produced - tracks too short or filters too strict.")
    meta = pd.DataFrame(metas, columns=["track_id", "mmsi", "t_end", "lat_end", "lon_end"])
    return np.stack(Xs), np.stack(Rs), np.array(ys), np.array(ts), meta


class Scaler:
    """Per-feature standardisation fitted on CLEAN TRAIN windows only."""

    def fit(self, X):
        flat = X.reshape(-1, X.shape[-1])
        self.mean = flat.mean(0)
        self.std = np.maximum(flat.std(0), 1e-6)
        return self

    def transform(self, X):
        return ((X - self.mean) / self.std).astype(np.float32)

    def to_dict(self):
        return {"features": FEATURES, "mean": self.mean.tolist(), "std": self.std.tolist()}
