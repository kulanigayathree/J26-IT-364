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
