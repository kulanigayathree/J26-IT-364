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

// ---- reef health by location: GET /api/c3/sites, /api/c3/sites/{code}

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

export interface ReefSite {
  /** e.g. HKD, PGI */
  code: string;
  name: string;
  region: string;
  lat: number | null;
  lon: number | null;
  /** a Sentinel-2 composite is on the server: the model runs live */
  live: boolean;
  /** saved C3 results exist */
  saved: boolean;
  /** NOAA heat-stress (DHW) file exists */
  thermal: boolean;
}

export interface SitesStatus {
  available: boolean;
  message: string | null;
  model: C3ModelInfo | null;
  sites: ReefSite[];
}

export interface ClassCover {
  code: number;
  name: string;
  pixels: number;
  area_ha: number;
  percent: number;
}

export interface ThermalStress {
  latest: number;
  latest_date: string;
  max_12m: number;
  max_12m_date: string;
  max_all: number;
  max_all_date: string;
  /** NOAA Coral Reef Watch: No alert / Alert 1 / Alert 2 */
  alert: string;
  alert_text: string;
  severity: 'low' | 'medium' | 'high';
  monthly: { month: string; dhw: number }[];
}

export interface SiteHealth {
  code: string;
  name: string;
  region: string;
  lat: number | null;
  lon: number | null;
  source: 'live' | 'saved';
  source_note: string;
  cover: ClassCover[];
  coral_algae_percent: number | null;
  mapped_area_ha: number;
  /** agreement with the Allen Coral Atlas reference map, 0–1 */
  agreement: number | null;
  thermal: ThermalStress | null;
  /** PNG data URLs: live run gives rgb + classes, saved results give one figure */
  images: { rgb: string | null; classes: string | null; figure: string | null };
  runtime_ms: number;
}
