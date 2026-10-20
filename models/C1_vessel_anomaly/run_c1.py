"""C1 pipeline runner.

  python run_c1.py --csv data/raw/marinecadastre_2025.csv --inspect     # see your column names
  python run_c1.py --csv data/raw/marinecadastre_2025.csv               # full run
  python run_c1.py --demo                                               # code smoke test (fake data!)

Outputs go to --out (default: results_c1/): metrics.json, metrics.csv, model.pt, scaler.json
"""
import argparse
import json
import os
import sys

import numpy as np
import pandas as pd
import torch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import baselines as bl
import evaluate as ev
import features as ft
import inject as inj
import model as md


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv")
    ap.add_argument("--config", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "c1_config.yaml"))
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "results_c1"))
    ap.add_argument("--inspect", action="store_true")
    ap.add_argument("--demo", action="store_true", help="generate FAKE tracks to test the code only")
    ap.add_argument("--epochs", type=int)
    ap.add_argument("--arch", default="gru", choices=["gru", "lstm"], help="which autoencoder to train")
    args = ap.parse_args()

    cfg = ft.load_config(args.config)
    if args.epochs:
        cfg["model"]["epochs"] = args.epochs
    os.makedirs(args.out, exist_ok=True)

    if args.demo:
        from make_smoke_data import make_demo_csv
        args.csv = os.path.join(args.out, "DEMO_FAKE_TRACKS.csv")
        make_demo_csv(args.csv)
        cfg["columns"] = {"mmsi": "MMSI", "time": "BaseDateTime", "lat": "LAT", "lon": "LON", "sog": "SOG", "cog": "COG"}
        print("*** DEMO MODE: fake data. Results below say NOTHING about real performance. ***")
    if not args.csv:
        raise SystemExit("give --csv path (or --demo)")
    if args.inspect:
        ft.inspect_csv(args.csv)
        return

    device = "cuda" if torch.cuda.is_available() else "cpu"
    sp, w, ij = cfg["split"], cfg["windows"], cfg["injection"]

    print("1/6 loading + cleaning ...")
    df = ft.load_tracks(args.csv, cfg)
    print(f"    {len(df):,} pings, {df.mmsi.nunique():,} vessels, {df.track_id.nunique():,} tracks")

    print("2/6 splitting by vessel + injecting anomalies into val/test only ...")
    tr, va, te = ft.split_by_mmsi(df, sp, sp["seed"])
    va = inj.inject(va, sp["seed"] + 1, ij["frac_tracks"], ij["types"])
    te = inj.inject(te, sp["seed"] + 2, ij["frac_tracks"], ij["types"])
    # hold out 10% of TRAIN tracks (clean) for early stopping + score calibration
    tids = tr["track_id"].unique()
    rng = np.random.default_rng(sp["seed"] + 3)
    es_ids = set(rng.choice(tids, max(1, len(tids) // 10), replace=False))
    es = tr[tr["track_id"].isin(es_ids)]
    tr = tr[~tr["track_id"].isin(es_ids)]

    print("3/6 features + windows ...")
    W = {}
    for name, d in [("train", tr), ("es", es), ("val", va), ("test", te)]:
        W[name] = ft.make_windows(ft.compute_features(d), w["size"], w["stride"])
        n, pos = len(W[name][0]), int(W[name][2].sum())
        print(f"    {name:5s}: {n:,} windows ({pos:,} anomalous)")
    scaler = ft.Scaler().fit(W["train"][0])
    Xs = {k: scaler.transform(v[0]) for k, v in W.items()}
    R = {k: v[1] for k, v in W.items()}
    Y = {k: v[2] for k, v in W.items()}
    TY = {k: v[3] for k, v in W.items()}
    if Y["val"].sum() == 0 or Y["test"].sum() == 0:
        raise SystemExit("No injected anomalies landed in val/test - raise injection.frac_tracks or use more data.")

    mt = cfg["model"].get("max_train_windows")
    if mt and len(Xs["train"]) > mt:
        keep_idx = np.random.default_rng(sp["seed"]).choice(len(Xs["train"]), mt, replace=False)
        Xs["train"] = Xs["train"][keep_idx]
        print(f"    (training on a random {mt:,} of the train windows)")

    print("4/6 training %s autoencoder ..." % md.ARCH_LABEL[args.arch])
    model = md.train_model(Xs["train"], Xs["es"], cfg, device, arch=args.arch)
    ref = md.reconstruction_error(model, Xs["es"], device)
    q = cfg["model"]["score_ref_quantile"]
    with open(os.path.join(args.out, "score_scale.json"), "w") as _f:
        json.dump({"scale": float(np.quantile(ref, q))}, _f)
    s_val = md.to_unit_score(md.reconstruction_error(model, Xs["val"], device), ref, q)
    s_te = md.to_unit_score(md.reconstruction_error(model, Xs["test"], device), ref, q)
    lat_mean, lat_p95 = md.latency_ms(model, Xs["test"], device=device)

    print("5/6 baselines ...")
    far = cfg["evaluation"]["far_max"]
    main_name = md.ARCH_LABEL[args.arch] + (" (proposed)" if args.arch == "gru" else " (alternative)")
    results = [ev.evaluate_scored(main_name, Y["val"], s_val, Y["test"], s_te, TY["test"], far)]
    results[0]["val_f1"] = ev.metrics_at(Y["val"], (s_val >= results[0]["threshold"]).astype(int))["f1"]
    results[0]["latency_ms_mean_per_window"] = lat_mean
    results[0]["latency_ms_p95_per_window"] = lat_p95
    # Full C1 engine = autoencoder + rule-based transmission-gap analyzer (proposal FR5, >20 min silence).
    # The AE deliberately decays its memory over silences, so blackouts are caught by the rule layer.
    # The fixed 20-min rule fires on the NATURAL gaps of real data (very common) -> useless false alarms.
    # So the trigger is the larger of the proposal's 20 min and the 99th percentile of the longest silence
    # seen inside CLEAN held-out windows: only silences that are unusual for this data count as gaps.
    gap_cfg = cfg["evaluation"]["gap_trigger_s"]
    gap_nat = float(np.quantile(R["es"][:, :, 0].max(1), 0.99))
    gap_s = max(gap_cfg, gap_nat)
    print("    gap analyzer trigger: %.0f s (config %.0f s, natural-gap p99 %.0f s)" % (gap_s, gap_cfg, gap_nat))
    g_val = (R["val"][:, :, 0].max(1) > gap_s).astype(float)
    g_te = (R["test"][:, :, 0].max(1) > gap_s).astype(float)
    full = ev.evaluate_scored("AE + gap analyzer (full C1 engine)", Y["val"], np.maximum(s_val, g_val),
                              Y["test"], np.maximum(s_te, g_te), TY["test"], far)
    full["latency_ms_mean_per_window"] = lat_mean
    results.append(full)
    for name, fit in [("Isolation Forest", bl.fit_isolation_forest), ("One-Class SVM", bl.fit_ocsvm)]:
        score_fn = fit(Xs["train"], sp["seed"])
        results.append(ev.evaluate_scored(name, Y["val"], score_fn(Xs["val"]), Y["test"], score_fn(Xs["test"]), TY["test"], far))
    results.append(ev.evaluate_binary("Static threshold rules", Y["test"], bl.static_threshold(R["test"]), TY["test"]))

    print("6/6 saving ...")
    # ---- files used by dashboard.py ----
    meta = W["test"][4].copy()
    meta["y_true"] = Y["test"]
    meta["anomaly_type"] = [ft.ANOM_NAMES[int(c)] or "none" for c in TY["test"]]
    meta["score_ae"] = s_te
    meta["score_full"] = np.maximum(s_te, g_te)
    meta["t_end"] = meta["t_end"].astype(str)
    meta.to_csv(os.path.join(args.out, "test_windows.csv"), index=False)
    keep = te["track_id"].drop_duplicates().iloc[:150]          # cap size for the map
    tt = te[te["track_id"].isin(keep)][["mmsi", "track_id", "time", "lat", "lon", "sog", "cog", "anom", "anom_type"]].copy()
    tt["time"] = tt["time"].astype(str)
    tt.to_csv(os.path.join(args.out, "test_tracks.csv"), index=False)
    with open(os.path.join(args.out, "run_info.json"), "w") as f:
        json.dump({
            "source_file": os.path.basename(args.csv),
            "is_demo": bool(args.demo),
            "n_pings": int(len(df)), "n_vessels": int(df.mmsi.nunique()),
            "n_train_windows": int(len(Xs["train"])), "n_test_windows": int(len(Xs["test"])),
            "far_max": far, "full_engine_threshold": full["threshold"], "gap_trigger_s_used": gap_s,
            "latency_ms_mean": lat_mean, "device": device,
        }, f, indent=2)
    torch.save(model.state_dict(), os.path.join(args.out, "model.pt"))
    with open(os.path.join(args.out, "model_arch.json"), "w") as f:
        json.dump({"arch": args.arch, "hidden": cfg["model"]["hidden"], "latent": cfg["model"]["latent"]}, f)
    with open(os.path.join(args.out, "scaler.json"), "w") as f:
        json.dump(scaler.to_dict(), f, indent=2)
    with open(os.path.join(args.out, "metrics.json"), "w") as f:
        json.dump(results, f, indent=2)
    table = pd.DataFrame([{k: v for k, v in r.items() if k != "per_type"} for r in results])
    table.to_csv(os.path.join(args.out, "metrics.csv"), index=False)

    pd.set_option("display.width", 200)
    print("\nTEST RESULTS (threshold chosen on validation, FAR <= %.0f%%)" % (far * 100))
    print(table[["model", "roc_auc", "pr_auc", "precision", "recall", "f1", "far"]].round(3).to_string(index=False))
    print(f"\nProposed model latency: {lat_mean:.2f} ms mean / {lat_p95:.2f} ms p95 per window on {device} (target < 500 ms)")
    print("\nRecall per injected anomaly type (proposed model):")
    for k, v in results[0]["per_type"].items():
        print(f"  {k:9s} n={v['n_windows']:5d}  recall={v['recall']:.3f}")
    if args.demo:
        print("\n*** REMINDER: demo data is fake. Do not report any of these numbers. ***")


if __name__ == "__main__":
    main()
