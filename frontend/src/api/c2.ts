import type { C2Data, C2Forecast, C2Summary, C2Zones } from '../types/c2';
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
