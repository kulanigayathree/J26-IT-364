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
