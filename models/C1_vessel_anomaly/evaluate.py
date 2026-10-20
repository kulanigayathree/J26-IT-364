"""Metrics. The alert threshold is chosen on the VALIDATION set (max F1 subject to
FAR <= far_max) and then frozen and applied to the TEST set. Never tune on test."""
import numpy as np
from sklearn.metrics import roc_auc_score, average_precision_score, roc_curve

from features import ANOM_NAMES


def choose_threshold(y, s, far_max=0.05):
    fpr, tpr, thr = roc_curve(y, s)
    P, N = y.sum(), (1 - y).sum()
    tp, fp = tpr * P, fpr * N
    prec = np.where(tp + fp > 0, tp / np.maximum(tp + fp, 1e-9), 0.0)
    rec = tpr
    f1 = np.where(prec + rec > 0, 2 * prec * rec / np.maximum(prec + rec, 1e-9), 0.0)
    ok = (fpr <= far_max) & np.isfinite(thr)
    if not ok.any():
        return float(thr[np.isfinite(thr)][0])
    return float(thr[ok][np.argmax(f1[ok])])


def metrics_at(y, pred):
    tp = int(((pred == 1) & (y == 1)).sum())
    fp = int(((pred == 1) & (y == 0)).sum())
    tn = int(((pred == 0) & (y == 0)).sum())
    fn = int(((pred == 0) & (y == 1)).sum())
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
    far = fp / (fp + tn) if fp + tn else 0.0
    return {"precision": prec, "recall": rec, "f1": f1, "far": far, "tp": tp, "fp": fp, "tn": tn, "fn": fn}


def per_type_recall(y_type, pred):
    out = {}
    for code, name in ANOM_NAMES.items():
        if code == 0:
            continue
        m = y_type == code
        if m.sum():
            out[name] = {"n_windows": int(m.sum()), "recall": float(pred[m].mean())}
    return out


def evaluate_scored(name, y_val, s_val, y_te, s_te, ty_te, far_max):
    res = {"model": name}
    res["roc_auc"] = float(roc_auc_score(y_te, s_te))
    res["pr_auc"] = float(average_precision_score(y_te, s_te))
    thr = choose_threshold(y_val, s_val, far_max)
    pred = (s_te >= thr).astype(int)
    res["threshold"] = thr
    res.update(metrics_at(y_te, pred))
    res["per_type"] = per_type_recall(ty_te, pred)
    return res


def evaluate_binary(name, y_te, pred, ty_te):
    res = {"model": name, "roc_auc": None, "pr_auc": None, "threshold": None}
    res.update(metrics_at(y_te, pred))
    res["per_type"] = per_type_recall(ty_te, pred)
    return res
