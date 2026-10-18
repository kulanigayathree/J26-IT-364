/** Mirrors integration/api/app/schemas/c4.py. Keep both in sync. */
import type { Feature, FeatureCollection, LineString, Polygon } from 'geojson';
import type { Severity } from '@/design/tokens';

export type SpillStatus = 'new' | 'under_review' | 'confirmed' | 'dismissed';
export type EvidenceKind =
  'track_overlap' | 'proximity' | 'heading_alignment' | 'ais_gap' | 'speed_drop';

export interface SpillProperties {
  id: string;
  /** SAR acquisition time, ISO 8601 UTC. */
  detected_at: string;
  sensor: string;
  location_name: string;
  area_km2: number;
  /** Detector confidence, 0–1. */
  confidence: number;
  severity: Severity;
  status: SpillStatus;
  candidate_count: number;
}

export interface Evidence {
  kind: EvidenceKind;
  label: string;
  value: string;
}

export interface CandidateVessel {
  /** 1 = most likely candidate. */
  rank: number;
  mmsi: string;
  vessel_name: string;
  vessel_type: string;
  flag: string;
  /** Attribution score, 0–1. A ranking aid, not a probability of guilt. */
  score: number;
  evidence: Evidence[];
}

export interface CandidateTrackProperties {
  mmsi: string;
  vessel_name: string;
  rank: number;
}

/** GET /api/c4/spills */
export type Spills = FeatureCollection<Polygon, SpillProperties>;

/** GET /api/c4/spills/{spill_id} */
export interface SpillDetail {
  spill: Feature<Polygon, SpillProperties>;
  candidates: CandidateVessel[];
  candidate_tracks: FeatureCollection<LineString, CandidateTrackProperties>;
  attribution_method: string;
}
