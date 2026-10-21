// Matches integration/api/app/schemas/c2.py
import type { ModelMeta } from './common';

export interface Port {
  name: string;
  lon: number;
  lat: number;
}

export interface C2Summary {
  port: string;
  best_probability: number;
  best_lat: number;
  best_lon: number;
  /** return trip */
  distance_km: number;
}

export interface C2Data extends ModelMeta {
  issued_date: string;
  leads: { lead: number; date: string }[];
  ports: Port[];
  summary: C2Summary;
}

export interface C2Forecast extends ModelMeta {
  lead: number;
  date: string;
  /** cell centres */
  lat: number[];
  lon: number[];
  cell_size: number;
  /** [lat][lon]; null = land */
  probability: (number | null)[][];
  uncertainty: (number | null)[][];
}

export interface Zone {
  rank: number;
  lat: number;
  lon: number;
  probability: number;
  uncertainty: number;
  /** return trip from the port */
  distance_km: number;
  fuel_litres: number;
  fuel_cost_rs: number;
}

export interface C2Zones extends ModelMeta {
  lead: number;
  date: string;
  port: Port;
  fuel_l_per_km: number;
  fuel_price: number;
  zones: Zone[];
}

// ---- test-forecast replay: GET /api/c2/replay

export interface ReplayModel {
  key: string;
  label: string;
  has_uncertainty: boolean;
  uncertainty_note: string | null;
}

export interface ReplayStatus {
  available: boolean;
  message: string | null;
  models: ReplayModel[];
  first_date: string | null;
  last_date: string | null;
  best_model: string | null;
}

export interface DayMetrics {
  fishing_cells: number;
  sea_cells: number;
  roc_auc: number | null;
  pr_auc: number | null;
  /** share of actual fishing cells inside the 10% highest-probability cells */
  top10_capture: number | null;
}

export interface ReplayLead {
  lead: number;
  date: string;
  probability: (number | null)[][];
  uncertainty: (number | null)[][] | null;
  /** 1 = fishing happened, 0 = no fishing, null = land */
  actual: (number | null)[][];
  metrics: DayMetrics;
}

export interface ReplayResult {
  model: string;
  model_label: string;
  issued_after: string;
  lat: number[];
  lon: number[];
  cell_size: number;
  leads: ReplayLead[];
  runtime_ms: number;
}
