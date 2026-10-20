"""Baselines from the proposal (section 3.3) that are implemented so far.

Implemented : static threshold rules, Isolation Forest, One-Class SVM.
NOT yet implemented (proposal also lists them): Extended Kalman Filter, TD-DBSCAN,
offline Trajectory Transformer. Add them before the final evaluation.
"""
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.svm import OneClassSVM


def summarize(X):
    """(n,T,F) -> (n, 4F) window statistics: mean, std, min, max over time."""
    return np.concatenate([X.mean(1), X.std(1), X.min(1), X.max(1)], axis=1)


def static_threshold(R, sog_max=35.0, implied_max=50.0, rot_max=180.0, gap_max_s=1200.0):
    """Rule-based tripwire (mimics commercial static fences). R columns: dt, sog, implied_kn, |rot|."""
    flag = (
        (R[:, :, 1].max(1) > sog_max)
        | (R[:, :, 2].max(1) > implied_max)
        | (R[:, :, 3].max(1) > rot_max)
        | (R[:, :, 0].max(1) > gap_max_s)
    )
    return flag.astype(int)


def fit_isolation_forest(X_tr, seed=42):
    m = IsolationForest(n_estimators=200, random_state=seed, n_jobs=-1).fit(summarize(X_tr))
    return lambda X: -m.score_samples(summarize(X))          # higher = more anomalous


def fit_ocsvm(X_tr, seed=42, max_fit=15000):
    S = summarize(X_tr)
    if len(S) > max_fit:
        S = S[np.random.default_rng(seed).choice(len(S), max_fit, replace=False)]
    m = OneClassSVM(kernel="rbf", gamma="scale", nu=0.05).fit(S)
    return lambda X: -m.decision_function(summarize(X))
