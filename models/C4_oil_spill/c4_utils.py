# c4_utils.py  –  C4 Oil Spill Detection: image processing helpers
# (Saved to Drive by the C4_02 notebook and imported by later notebooks.)
import numpy as np
import cv2
from skimage import measure
from scipy import ndimage as ndi

# ---- Settings (tunable) ----
MEDIAN_K   = 5      # speckle filter size (odd number)
BG_FRAC    = 0.5    # background window = 50% of the image's shorter side
DARK_RATIO = 0.75   # pixel < background * DARK_RATIO  ->  dark
LAND_FACTOR = 1.3   # pixels 30% brighter than sea level = land (excluded from background)
MIN_AREA   = 60     # remove patches smaller than this (pixels)
OPEN_K     = 3      # remove small noise specks
CLOSE_K    = 5      # join broken slick fragments


def load_gray(path):
    """① Read the image as grayscale (0-255)."""
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise FileNotFoundError(path)
    return img


def denoise(img, k=None):
    """② Reduce speckle noise (median filter)."""
    return cv2.medianBlur(img, MEDIAN_K if k is None else k)


def dark_mask(filtered, bg_frac=None, ratio=None):
    """③ Threshold: pixels much darker than the surrounding sea (local background)."""
    bg_frac = BG_FRAC if bg_frac is None else bg_frac
    ratio = DARK_RATIO if ratio is None else ratio
    f = filtered.astype(np.float32)
    k = max(151, int(min(f.shape) * bg_frac) | 1)   # odd window, large enough for big look-alikes
    # Exclude bright land pixels from the background, so near-shore sea is not falsely "dark"
    valid = f > 0
    sea_level = np.median(f[valid]) if valid.any() else 1.0
    w = (valid & (f < LAND_FACTOR * sea_level)).astype(np.float32)
    background = cv2.blur(f * w, (k, k)) / np.maximum(cv2.blur(w, (k, k)), 1e-3)
    return (f < background * ratio) & valid      # valid: excludes image border / no-data


def clean_mask(mask, open_k=None, close_k=None, min_area=None):
    """④ Morphology: remove small specks, join fragments and fill holes."""
    open_k = OPEN_K if open_k is None else open_k
    close_k = CLOSE_K if close_k is None else close_k
    min_area = MIN_AREA if min_area is None else min_area
    m = mask.astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN,  np.ones((open_k, open_k), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((close_k, close_k), np.uint8))
    m = ndi.binary_fill_holes(m > 0)
    lab = measure.label(m > 0, connectivity=2)
    sizes = np.bincount(lab.ravel())
    keep = sizes >= min_area
    keep[0] = False
    return keep[lab]


def find_patches(clean):
    """⑤ Group connected pixels into numbered patches."""
    labels = measure.label(clean, connectivity=2)
    return labels, measure.regionprops(labels)


def detect(path):
    """Run steps ①-⑤ in one call."""
    img = load_gray(path)
    filt = denoise(img)
    raw = dark_mask(filt)
    clean = clean_mask(raw)
    labels, props = find_patches(clean)
    return dict(img=img, filtered=filt, raw=raw, clean=clean, labels=labels, props=props)


def label_patches(props, boxes, is_oil_image, min_overlap=0.5):
    """
    Assign a label to every patch:
      - No-oil image         -> 'look-alike'
      - Oil image, inside an oil box (>= min_overlap of the patch) -> 'oil'
      - Oil image, outside the boxes -> 'ignore' (uncertain, not used)
    boxes: [(xmin, ymin, xmax, ymax), ...] pixel coords
    """
    out = []
    for p in props:
        if not is_oil_image:
            out.append('look-alike')
            continue
        coords = p.coords  # (row, col)
        inside = np.zeros(len(coords), bool)
        for (x0, y0, x1, y1) in boxes:
            inside |= (coords[:, 1] >= x0) & (coords[:, 1] <= x1) & \
                      (coords[:, 0] >= y0) & (coords[:, 0] <= y1)
        out.append('oil' if inside.mean() >= min_overlap else 'ignore')
    return out


def boxes_detected(props, labels_list, boxes):
    """Which oil boxes were found by the threshold step (detection check)."""
    hit = [False] * len(boxes)
    for p, lab in zip(props, labels_list):
        if lab != 'oil':
            continue
        r0, c0, r1, c1 = p.bbox
        for i, (x0, y0, x1, y1) in enumerate(boxes):
            if c0 <= x1 and c1 >= x0 and r0 <= y1 and r1 >= y0:
                hit[i] = True
    return hit
