# c4_utils.py  –  C4 Oil Spill Detection: image processing helpers
# (C4_02 notebook eken Drive ekata save wenawa. Passe notebooks walath import karanawa.)
import numpy as np
import cv2
from skimage import measure
from scipy import ndimage as ndi

# ---- Settings (tune karanna puluwan) ----
MEDIAN_K   = 5      # speckle filter size (odd number)
BG_FRAC    = 0.5    # background window = image eke podi paththen 50%
DARK_RATIO = 0.75   # pixel < background * DARK_RATIO  ->  dark
LAND_FACTOR = 1.3   # muhudu level ekata wada 30% wadi bright = godabima (background ekata ganne naha)
MIN_AREA   = 60     # meetharam pixels walata adu patches ain karanawa
OPEN_K     = 3      # podi noise thith ain karanna
CLOSE_K    = 5      # kæli patta ekathu karanna


def load_gray(path):
    """① Image eka grayscale (0-255) widiyata kiyawanawa."""
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise FileNotFoundError(path)
    return img


def denoise(img, k=None):
    """② Speckle noise adu karanawa (median filter)."""
    return cv2.medianBlur(img, MEDIAN_K if k is None else k)


def dark_mask(filtered, bg_frac=None, ratio=None):
    """③ Threshold: wate muhudata (local background) wada godak kalu pixels."""
    bg_frac = BG_FRAC if bg_frac is None else bg_frac
    ratio = DARK_RATIO if ratio is None else ratio
    f = filtered.astype(np.float32)
    k = max(151, int(min(f.shape) * bg_frac) | 1)   # odd window, loku look-alikes walatath
    # Godabima (bright) pixels background eken ain karanawa -> werala langa muhuda boruwata "kalu" wenne naha
    valid = f > 0
    sea_level = np.median(f[valid]) if valid.any() else 1.0
    w = (valid & (f < LAND_FACTOR * sea_level)).astype(np.float32)
    background = cv2.blur(f * w, (k, k)) / np.maximum(cv2.blur(w, (k, k)), 1e-3)
    return (f < background * ratio) & valid      # valid: image border / no-data ain karanawa


def clean_mask(mask, open_k=None, close_k=None, min_area=None):
    """④ Morphology: podi thith ain karala, kæli patta ekathu karala, hidas pirawanawa."""
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
    """⑤ Ekata ella thiyena pixels ekathu karala patches number karanawa."""
    labels = measure.label(clean, connectivity=2)
    return labels, measure.regionprops(labels)


def detect(path):
    """①-⑤ okkoma ekama function ekakin."""
    img = load_gray(path)
    filt = denoise(img)
    raw = dark_mask(filt)
    clean = clean_mask(raw)
    labels, props = find_patches(clean)
    return dict(img=img, filtered=filt, raw=raw, clean=clean, labels=labels, props=props)


def label_patches(props, boxes, is_oil_image, min_overlap=0.5):
    """
    Hama patch ekakatama label denawa:
      - No-oil image         -> 'look-alike'
      - Oil image, kotuwa athule (patch eken >= min_overlap) -> 'oil'
      - Oil image, kotuwen pita -> 'ignore' (pæhædili naha, use karanne naha)
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
    """Oil kotu walin keeyak threshold eken hoyagaththa da (detection check)."""
    hit = [False] * len(boxes)
    for p, lab in zip(props, labels_list):
        if lab != 'oil':
            continue
        r0, c0, r1, c1 = p.bbox
        for i, (x0, y0, x1, y1) in enumerate(boxes):
            if c0 <= x1 and c1 >= x0 and r0 <= y1 and r1 >= y0:
                hit[i] = True
    return hit
