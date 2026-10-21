import type { C2Data, C2Forecast, C2Summary, C2Zones, ReplayResult, ReplayStatus } from '../types/c2';
import { api } from './client';

export const getC2Summary = () => api<C2Summary>('/api/c2/summary');
export const getC2Data = () => api<C2Data>('/api/c2/data');
export const getC2Forecast = (lead: number) => api<C2Forecast>('/api/c2/forecast', { query: { lead } });

export const getC2Zones = (params: {
  lead: number;
  port: string;
  fuel_l_per_km: number;
  fuel_price: number;
  /** optional limit on return-trip distance */
  max_km?: number;
}) => api<C2Zones>('/api/c2/zones', { query: params });

/** Which saved C2 test forecasts are available on the server. */
export const getC2ReplayStatus = () => api<ReplayStatus>('/api/c2/replay/status');

/** The C2 model's saved 3-day forecast starting on `date`, next to the actual fishing. */
export const getC2Replay = (date: string, model: string) =>
  api<ReplayResult>('/api/c2/replay', { query: { date, model } });
