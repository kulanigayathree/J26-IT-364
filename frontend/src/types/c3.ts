// Matches integration/api/app/schemas/c3.py
import type { ModelMeta } from './common';

export type ReefStatus = 'good' | 'watch' | 'at_risk';

export interface MonthlyCover {
  /** YYYY-MM */
  month: string;
  /** class name -> percent, e.g. { Coral: 31.2, Algae: 28.4, Other: 40.4 } */
  cover: Record<string, number>;
}

export interface Reef {
  id: string;
  name: string;
  region: string;
  lon: number;
  lat: number;
  status: ReefStatus;
  /** change in coral cover over 12 months, percentage points */
  change_12m: number;
  latest_month: string;
  latest_cover: Record<string, number>;
  monthly: MonthlyCover[];
}

export interface C3Summary {
  reefs_total: number;
  at_risk: number;
  watch: number;
  mean_coral: number | null;
}

export interface C3Data extends ModelMeta {
  classes: string[];
  summary: C3Summary;
  reefs: Reef[];
}

// ---- live classification: POST /api/c3/classify

export interface C3ModelInfo {
  name: string | null;
  experiment: string | null;
  features: string[];
  classes: string[];
  composite_version: string | null;
  cv_macro_f1: number | null;
  cv_accuracy: number | null;
  trained_with: Record<string, string> | null;
}

export interface CompositeExample {
  /** file name in data/external/c3/ */
  id: string;
  site: string;
  version: string;
  has_reef_mask: boolean;
}

export interface ClassifyStatus {
  available: boolean;
  message: string | null;
  model: C3ModelInfo | null;
  examples: CompositeExample[];
}

export interface ClassCover {
  code: number;
  name: string;
  pixels: number;
  area_ha: number;
  percent: number;
}

export interface ClassifyResult {
  image: string;
  width: number;
  height: number;
  classified_pixels: number;
  reef_mask_used: boolean;
  smoothed: boolean;
  cover: ClassCover[];
  glint: Record<string, number>;
  /** PNG data URLs */
  images: { rgb: string; classes: string };
  runtime_ms: number;
}
