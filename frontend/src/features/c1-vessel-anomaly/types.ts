/** Mirrors integration/api/app/schemas/c1.py. Keep both in sync. */
import type { FeatureCollection, LineString, Point } from 'geojson';
import type { Severity } from '@/design/tokens';

export type AnomalyType =
  'ais_gap' | 'loitering' | 'speed_change' | 'route_deviation' | 'dark_vessel';
export type DetectionSource = 'AIS' | 'SAR' | 'AIS+SAR';

export interface VesselTrackProperties {
  mmsi: string;
  vessel_name: string;
  vessel_type: string;
  /** ISO 3166-1 alpha-2 flag state. */
  flag: string;
  /** ISO 8601 UTC. */
  start_time: string;
  end_time: string;
  point_count: number;
}

export interface AnomalyProperties {
  id: string;
  /** "unknown" for SAR-only detections. */
  mmsi: string;
  vessel_name: string;
  anomaly_type: AnomalyType;
  /** 0–1, higher is more unusual. */
  score: number;
  severity: Severity;
  /** ISO 8601 UTC. */
  detected_at: string;
  source: DetectionSource;
  description: string;
}

/** GET /api/c1/tracks */
export type VesselTracks = FeatureCollection<LineString, VesselTrackProperties>;
/** GET /api/c1/anomalies */
export type Anomalies = FeatureCollection<Point, AnomalyProperties>;
