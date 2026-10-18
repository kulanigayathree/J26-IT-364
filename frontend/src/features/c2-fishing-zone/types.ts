/** Mirrors integration/api/app/schemas/c2.py. Keep both in sync. */
import type { FeatureCollection, Polygon } from 'geojson';

export type LeadTime = 24 | 48 | 72;
export type Confidence = 'high' | 'medium' | 'low';

export interface Port {
  id: string;
  name: string;
  district: string;
  lon: number;
  lat: number;
}

export interface ForecastCellProperties {
  cell_id: string;
  /** Probability of a good catch in this cell, 0–1. */
  probability: number;
  /** Spread of the forecast (e.g. ensemble std), 0–1. Higher is less certain. */
  uncertainty: number;
}

export interface BestZone {
  port_id: string;
  port_name: string;
  lead_time_h: LeadTime;
  lon: number;
  lat: number;
  probability: number;
  uncertainty: number;
  confidence: Confidence;
  /** Straight-line distance from the port. */
  distance_km: number;
  bearing_deg: number;
  /** 8-point compass direction from the port, e.g. "SW". */
  direction: string;
  /** Round trip estimate. */
  fuel_litres: number;
  fuel_rate_l_per_km: number;
  valid_from: string;
  valid_to: string;
}

/** GET /api/c2/forecast?lead_time_h=&port_id= */
export interface Forecast {
  issued_at: string;
  lead_time_h: LeadTime;
  valid_from: string;
  valid_to: string;
  cell_size_deg: number;
  model_version: string;
  cells: FeatureCollection<Polygon, ForecastCellProperties>;
  best_zone: BestZone;
}

/** Forecast as stored in mock/forecast_<h>.json (best zone is added per port). */
export type ForecastGrid = Omit<Forecast, 'best_zone'>;
