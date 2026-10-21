// Matches integration/api/app/schemas/c1.py
import type { ModelMeta, Severity } from './common';

export interface Vessel {
  vessel_id: string;
  name: string;
  type: string;
  lon: number;
  lat: number;
  time: string;
}

export interface Anomaly {
  id: string;
  vessel_id: string;
  vessel_name: string;
  anomaly_type: string;
  score: number;
  severity: Severity;
  time: string;
  lon: number;
  lat: number;
  description: string;
}

export interface C1Summary {
  anomalies_today: number;
  high_severity: number;
  vessels_tracked: number;
  total_anomalies: number;
}

export interface C1Data extends ModelMeta {
  summary: C1Summary;
  vessels: Vessel[];
  anomalies: Anomaly[];
}

// ---- live analysis: POST /api/c1/analyse

export interface ExampleTrack {
  id: string;
  mmsi: string;
  pings: number;
  start: string;
  end: string;
  /** anomaly types injected into this track during C1's evaluation */
  injected: string[];
}

export interface ModelMetrics {
  model: string | null;
  roc_auc: number | null;
  pr_auc: number | null;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  far: number | null;
}

export interface AnalyseStatus {
  available: boolean;
  message: string | null;
  model: string | null;
  threshold: number | null;
  metrics: ModelMetrics | null;
  examples: ExampleTrack[];
}

export interface AnomalyEvent {
  id: number;
  type: string;
  max_score: number;
  start: string;
  end: string;
  lat: number;
  lon: number;
  windows: number;
  injected: string[];
}

export interface AnalyseResult {
  summary: {
    pings: number;
    vessels: number;
    tracks: number;
    windows: number;
    flagged_windows: number;
    events: number;
    injected_windows: number;
    injected_caught: number;
    threshold: number;
    gap_trigger_s: number;
    runtime_ms: number;
  };
  events: AnomalyEvent[];
  track: { t: string; lat: number; lon: number; sog: number; track: number; injected: boolean }[];
  timeline: { t: string; score: number; flagged: boolean; injected: boolean }[];
}
