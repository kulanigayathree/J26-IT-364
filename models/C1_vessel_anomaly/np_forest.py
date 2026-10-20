"""A RandomForest that runs on plain numpy (no scikit-learn needed).

Why: the type classifier is trained in Colab (newer scikit-learn). A pickle of it cannot be loaded by an older
Python / scikit-learn on another computer. So export_type_clf.py (run where scikit-learn works) copies the trees
into a .npz file, and this class predicts from that file with numpy only - same answers, any computer.
"""
import numpy as np


class NPForest:
    def __init__(self, trees, classes):
        self.trees = trees                         # list of dicts: left, right, feature, threshold, proba
        self.classes_ = np.asarray(classes)

    # ------------------------------------------------------------------ build from a fitted sklearn forest
    @classmethod
    def from_sklearn(cls, clf):
        trees = []
        for est in clf.estimators_:
            t = est.tree_
            v = t.value[:, 0, :].astype(np.float64)
            v = v / np.maximum(v.sum(axis=1, keepdims=True), 1e-12)        # class shares at every node
            trees.append({"left": t.children_left.astype(np.int32), "right": t.children_right.astype(np.int32),
                          "feature": t.feature.astype(np.int32), "threshold": t.threshold.astype(np.float64),
                          "proba": v})
        return cls(trees, clf.classes_)

    # ------------------------------------------------------------------ save / load
    def save(self, path):
        d = {"classes": self.classes_, "n_trees": np.array(len(self.trees))}
        for i, t in enumerate(self.trees):
            for k, a in t.items():
                d["t%d_%s" % (i, k)] = a
        np.savez_compressed(path, **d)

    @classmethod
    def load(cls, path):
        z = np.load(path)
        trees = [{k: z["t%d_%s" % (i, k)] for k in ("left", "right", "feature", "threshold", "proba")}
                 for i in range(int(z["n_trees"]))]
        return cls(trees, z["classes"])

    # ------------------------------------------------------------------ predict
    def predict_proba(self, X):
        X = np.asarray(X, dtype=np.float32)                                # scikit-learn compares in float32
        n = len(X)
        out = np.zeros((n, len(self.classes_)), dtype=np.float64)
        rows = np.arange(n)
        for t in self.trees:
            node = np.zeros(n, dtype=np.int64)
            active = t["left"][node] != -1
            while active.any():
                idx = rows[active]
                nd = node[idx]
                go_left = X[idx, t["feature"][nd]] <= t["threshold"][nd]
                node[idx] = np.where(go_left, t["left"][nd], t["right"][nd])
                active = t["left"][node] != -1
            out += t["proba"][node]
        return out / len(self.trees)

    def predict(self, X):
        return self.classes_[self.predict_proba(X).argmax(axis=1)]
