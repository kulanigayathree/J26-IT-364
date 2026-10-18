/** Mirrors integration/api/app/schemas/c3.py. Keep both in sync. */
import type { FeatureCollection, Point } from 'geojson';

export type ReefStatus = 'healthy' | 'watch' | 'degraded';

export interface ReefProperties {
  id: string;
  name: string;
  region: string;
  /** YYYY-MM of the latest cloud-free composite. */
  latest_month: string;
  coral_cover_pct: number;
  algae_cover_pct: number;
  sand_rubble_pct: number;
  /** Change in coral cover over 12 months, percentage points. */
  change_12m_pct: number;
  status: ReefStatus;
  /** Highest degree heating weeks in the last 12 months (°C-weeks). */
  max_dhw_12m: number;
}

export interface MonthlyCover {
  /** YYYY-MM */
  month: string;
  /** null when no cloud-free image was available that month. */
  coral_pct: number | null;
  algae_pct: number | null;
  sand_rubble_pct: number | null;
  cloud_free_obs: number;
}

export interface HeatStressMonth {
  month: string;
  /** Degree heating weeks (°C-weeks) this year. */
  dhw: number;
  /** Same month one year earlier. */
  dhw_previous_year: number;
}

/** GET /api/c3/reefs/{reef_id} */
export interface ReefDetail extends ReefProperties {
  lon: number;
  lat: number;
  series: MonthlyCover[];
  heat_stress: HeatStressMonth[];
  method_note: string;
}

/** GET /api/c3/reefs */
export type Reefs = FeatureCollection<Point, ReefProperties>;
