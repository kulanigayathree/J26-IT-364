import { fetchData, type Loaded } from '@/lib/apiClient';
import type { OverviewData } from '@/lib/feature';
import { formatPosition } from '@/lib/format';
import { anomalyLabel } from './components/labels';
import type { Anomalies, VesselTracks } from './types';

export function fetchTracks(signal?: AbortSignal) {
  return fetchData<VesselTracks>('/api/c1/tracks', {
    signal,
    mock: () => import('./mock/tracks.json').then((m) => m.default as unknown as VesselTracks),
  });
}

export function fetchAnomalies(signal?: AbortSignal) {
  return fetchData<Anomalies>('/api/c1/anomalies', {
    signal,
    mock: () => import('./mock/anomalies.json').then((m) => m.default as unknown as Anomalies),
  });
}

/** Latest anomalies for the Overview page. */
export async function fetchOverview(signal?: AbortSignal): Promise<Loaded<OverviewData>> {
  const result = await fetchAnomalies(signal);
  const alerts = [...result.data.features]
    .sort((a, b) => b.properties.detected_at.localeCompare(a.properties.detected_at))
    .map((f) => ({
      id: f.properties.id,
      title: `${anomalyLabel[f.properties.anomaly_type]} · ${f.properties.vessel_name}`,
      detail: `Score ${f.properties.score.toFixed(2)} · ${formatPosition(f.geometry.coordinates)}`,
      time: f.properties.detected_at,
      severity: f.properties.severity,
      href: `/c1?anomaly=${encodeURIComponent(f.properties.id)}`,
    }));
  return { ...result, data: { layer: result.data, alerts } };
}
