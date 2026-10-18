import type { AnomalyType } from '../types';

export const anomalyLabel: Record<AnomalyType, string> = {
  ais_gap: 'AIS gap',
  loitering: 'Loitering',
  speed_change: 'Speed change',
  route_deviation: 'Route deviation',
  dark_vessel: 'Dark vessel',
};
