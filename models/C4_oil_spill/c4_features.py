# c4_features.py  –  C4 Oil Spill Detection: patch feature extraction
# (C4_03 notebook eken Drive ekata save wenawa. Training + frontend notebooks walath import karanawa.)
import numpy as np
import cv2
import c4_utils as u

RING = 15   # patch eka wate "muhuda" ganna pixels ganana

FEATURES = [
    'area', 'perimeter', 'elongation', 'eccentricity', 'solidity', 'extent', 'compactness',
    'mean_int', 'std_int', 'min_int', 'bg_mean', 'bg_std', 'contrast', 'intensity_ratio',
    'edge_gradient', 'area_frac', 'img_mean', 'img_std', 'is_coast',
]


def patch_features(res, is_coast=0):
    """
    u.detect() result eke hama patch ekakatama features dict ekak denawa.
      Shape     : area, perimeter, elongation, eccentricity, solidity, extent, compactness
      Darkness  : mean_int, std_int, min_int
      Context   : bg_mean, bg_std, contrast, intensity_ratio (patch vs wate muhuda)
      Edge      : edge_gradient (hidas keeyak sharp da)
      Image     : area_frac, img_mean, img_std, is_coast
    """
    f = res['filtered'].astype(np.float32)
    labels = res['labels']
    H, W = f.shape
    valid = f > 0
    img_mean = float(f[valid].mean()) if valid.any() else 0.0
    img_std = float(f[valid].std()) if valid.any() else 0.0
    gx = cv2.Sobel(f, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(f, cv2.CV_32F, 0, 1, ksize=3)
    grad = np.sqrt(gx ** 2 + gy ** 2)
    k_ring = np.ones((2 * RING + 1, 2 * RING + 1), np.uint8)
    k3 = np.ones((3, 3), np.uint8)

    rows = []
    for p in res['props']:
        r0, c0, r1, c1 = p.bbox
        R0, C0 = max(r0 - RING, 0), max(c0 - RING, 0)
        R1, C1 = min(r1 + RING, H), min(c1 + RING, W)
        lab = labels[R0:R1, C0:C1]
        fc, gc, vc = f[R0:R1, C0:C1], grad[R0:R1, C0:C1], valid[R0:R1, C0:C1]
        mask = (lab == p.label).astype(np.uint8)

        ring = (cv2.dilate(mask, k_ring) > 0) & (lab == 0) & vc
        bg = fc[ring]
        bg_mean = float(bg.mean()) if bg.size else img_mean
        bg_std = float(bg.std()) if bg.size else img_std

        inside = fc[mask > 0]
        mean_int = float(inside.mean())
        boundary = (mask > 0) & ~(cv2.erode(mask, k3) > 0)
        edge = float(gc[boundary].mean()) if boundary.any() else 0.0

        major = float(getattr(p, 'axis_major_length', None) or p.major_axis_length)
        minor = float(getattr(p, 'axis_minor_length', None) or p.minor_axis_length)
        perim = float(p.perimeter) if p.perimeter > 0 else 1.0
        rows.append(dict(
            area=float(p.area),
            perimeter=perim,
            elongation=major / max(minor, 1.0),
            eccentricity=float(p.eccentricity),
            solidity=float(p.solidity),
            extent=float(p.extent),
            compactness=float(4 * np.pi * p.area / perim ** 2),
            mean_int=mean_int,
            std_int=float(inside.std()),
            min_int=float(inside.min()),
            bg_mean=bg_mean,
            bg_std=bg_std,
            contrast=(bg_mean - mean_int) / max(bg_mean, 1.0),
            intensity_ratio=mean_int / max(bg_mean, 1.0),
            edge_gradient=edge / max(bg_mean, 1.0),
            area_frac=float(p.area) / (H * W),
            img_mean=img_mean,
            img_std=img_std,
            is_coast=int(is_coast),
        ))
    return rows


def image_features(path, boxes=None, is_oil_image=False, is_coast=0):
    """Image ekak -> patches -> features + labels (training walata)."""
    res = u.detect(path)
    feats = patch_features(res, is_coast)
    labs = u.label_patches(res['props'], boxes or [], is_oil_image)
    for row, lab, p in zip(feats, labs, res['props']):
        row['label'] = lab
        row['centroid_r'], row['centroid_c'] = (float(v) for v in p.centroid)
    return feats
