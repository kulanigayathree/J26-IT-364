import type { Feature, Point } from 'geojson';
import { ApiError, fetchData, type Loaded } from '@/lib/apiClient';
import type { OverviewData } from '@/lib/feature';
import { formatLatLon, formatPercent } from '@/lib/format';
import type { BestZone, Forecast, ForecastGrid, LeadTime, Port } from './types';

export const DEFAULT_PORT = 'negombo';

/* ------------------------------------------------------------ mock loaders */

const mockGrid: Record<LeadTime, () => Promise<ForecastGrid>> = {
  24: () => import('./mock/forecast_24.json').then((m) => m.default as unknown as ForecastGrid),
  48: () => import('./mock/forecast_48.json').then((m) => m.default as unknown as ForecastGrid),
  72: () => import('./mock/forecast_72.json').then((m) => m.default as unknown as ForecastGrid),
};

async function mockBestZone(portId: string, lead: LeadTime): Promise<BestZone> {
  const zones = (await import('./mock/best_zones.json')).default as unknown as BestZone[];
  const zone = zones.find((z) => z.port_id === portId && z.lead_time_h === lead);
  if (!zone) throw new ApiError(`No forecast for port "${portId}".`, 'http', 404);
  return zone;
}

/* ------------------------------------------------------------ API */

export function fetchPorts(signal?: AbortSignal) {
  return fetchData<Port[]>('/api/c2/ports', {
    signal,
    cacheKey: 'c2:ports',
    mock: () => import('./mock/ports.json').then((m) => m.default as Port[]),
  });
}

export function fetchForecast(lead: LeadTime, portId: string, signal?: AbortSignal) {
  return fetchData<Forecast>('/api/c2/forecast', {
    query: { lead_time_h: lead, port_id: portId },
    signal,
    cacheKey: `c2:forecast:${lead}:${portId}`,
    mock: async () => ({
      ...(await mockGrid[lead]()),
      best_zone: await mockBestZone(portId, lead),
    }),
  });
}

/** Today's best zone for one harbour (fisher view). Cached on the phone for use at sea. */
export function fetchBestZone(portId: string, lead: LeadTime = 24, signal?: AbortSignal) {
  return fetchData<BestZone>('/api/c2/best-zone', {
    query: { port_id: portId, lead_time_h: lead },
    signal,
    cacheKey: `c2:best-zone:${portId}:${lead}`,
    mock: () => mockBestZone(portId, lead),
  });
}

/** Overview: high-probability cells for the next 24 h plus the best zone from the default port. */
export async function fetchOverview(signal?: AbortSignal): Promise<Loaded<OverviewData>> {
  const result = await fetchForecast(24, DEFAULT_PORT, signal);
  const { cells, best_zone: zone } = result.data;
  const zonePoint: Feature<Point> = {
    type: 'Feature',
    id: 'best-zone',
    geometry: { type: 'Point', coordinates: [zone.lon, zone.lat] },
    properties: {},
  };
  return {
    ...result,
    data: {
      layer: {
        type: 'FeatureCollection',
        features: [...cells.features.filter((f) => f.properties.probability >= 0.55), zonePoint],
      },
      alerts: [
        {
          id: `c2-best-${zone.port_id}`,
          title: `Best zone from ${zone.port_name}`,
          detail: `${formatLatLon(zone.lat, zone.lon)} · ${zone.distance_km.toFixed(0)} km · catch chance ${formatPercent(zone.probability)}`,
          time: result.data.issued_at,
          tag: 'Forecast 24 h',
          href: `/c2?port=${zone.port_id}`,
        },
      ],
    },
  };
}
