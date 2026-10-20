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
