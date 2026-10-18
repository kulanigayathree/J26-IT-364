import { ApiError, fetchData, type Loaded } from '@/lib/apiClient';
import type { OverviewData } from '@/lib/feature';
import type { SpillDetail, Spills } from './types';

export function fetchSpills(signal?: AbortSignal) {
  return fetchData<Spills>('/api/c4/spills', {
    signal,
    mock: () => import('./mock/spills.json').then((m) => m.default as unknown as Spills),
  });
}

export function fetchSpill(spillId: string, signal?: AbortSignal) {
  return fetchData<SpillDetail>(`/api/c4/spills/${encodeURIComponent(spillId)}`, {
    signal,
    mock: async () => {
      const all = (await import('./mock/spill_details.json')).default as unknown as Record<
        string,
        SpillDetail
      >;
      const detail = all[spillId];
      if (!detail) throw new ApiError(`No spill with id "${spillId}".`, 'http', 404);
      return detail;
    },
  });
}

/** Overview: open spill detections, newest first. */
export async function fetchOverview(signal?: AbortSignal): Promise<Loaded<OverviewData>> {
  const result = await fetchSpills(signal);
  const open = result.data.features.filter((f) => f.properties.status !== 'dismissed');
  const alerts = [...open]
    .sort((a, b) => b.properties.detected_at.localeCompare(a.properties.detected_at))
    .map((f) => ({
      id: f.properties.id,
      title: `Possible slick · ${f.properties.location_name}`,
      detail: `${f.properties.area_km2.toFixed(1)} km² · ${f.properties.candidate_count} candidate vessels`,
      time: f.properties.detected_at,
      severity: f.properties.severity,
      href: `/c4/${f.properties.id}`,
    }));
  return { ...result, data: { layer: { ...result.data, features: open }, alerts } };
}
