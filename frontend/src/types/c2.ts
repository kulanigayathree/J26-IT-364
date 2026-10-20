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
