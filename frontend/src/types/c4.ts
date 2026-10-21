// Matches integration/api/app/schemas/c4.py
import type { ModelMeta, Severity } from './common';

/** A candidate source vessel. Candidate, not proof. */
export interface Candidate {
  rank: number;
  vessel_id: string;
  vessel_name: string;
  score: number;
  evidence: string[];
}

export interface Spill {
  id: string;
  location_name: string;
  lon: number;
  lat: number;
  detected_at: string;
  sensor: string;
  area_km2: number;
  confidence: number;
  severity: Severity;
  status: 'active' | 'resolved';
  /** ring of [lon, lat] */
  polygon: [number, number][];
  candidates: Candidate[];
}

export interface C4Summary {
  active: number;
  total: number;
  high_severity: number;
  candidate_vessels: number;
}

export interface C4Data extends ModelMeta {
  summary: C4Summary;
  spills: Spill[];
}

// ---- live detection: POST /api/c4/detect

export interface ClassifierStatus {
  available: boolean;
  name: string | null;
  threshold: number | null;
  message: string | null;
}

export interface DetectedPatch {
  id: number;
  /** "dark spot" = found but not classified (no model file installed) */
  verdict: 'oil' | 'look-alike' | 'dark spot';
  /** probability of oil, null when not classified */
  probability: number | null;
  area_px: number;
  elongation: number;
  contrast: number;
  /** [x0, y0, x1, y1] in pixels */
  bbox: number[];
  /** [[x, y], ...] in pixels */
  outline: number[][];
}

export interface DetectResult {
  width: number;
  height: number;
  classifier: ClassifierStatus;
  n_patches: number;
  n_oil: number;
  patches: DetectedPatch[];
  /** PNG data URLs of each step */
  images: { original: string; filtered: string; mask: string };
  runtime_ms: number;
}
