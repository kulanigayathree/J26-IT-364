import { ApiError, fetchData, type Loaded } from '@/lib/apiClient';
import type { OverviewData } from '@/lib/feature';
import { formatMonth } from '@/lib/format';
import { reefStatus } from './components/status';
import type { ReefDetail, Reefs } from './types';

export function fetchReefs(signal?: AbortSignal) {
  return fetchData<Reefs>('/api/c3/reefs', {
    signal,
    mock: () => import('./mock/reefs.json').then((m) => m.default as unknown as Reefs),
  });
}

export function fetchReef(reefId: string, signal?: AbortSignal) {
  return fetchData<ReefDetail>(`/api/c3/reefs/${encodeURIComponent(reefId)}`, {
    signal,
    mock: async () => {
      const all = (await import('./mock/reef_details.json')).default as unknown as Record<
        string,
        ReefDetail
      >;
      const reef = all[reefId];
      if (!reef) throw new ApiError(`No reef with id "${reefId}".`, 'http', 404);
      return reef;
    },
  });
}

/** Overview: reefs that need attention, worst first. */
export async function fetchOverview(signal?: AbortSignal): Promise<Loaded<OverviewData>> {
  const result = await fetchReefs(signal);
  const rank = { degraded: 0, watch: 1, healthy: 2 };
  const alerts = result.data.features
    .filter((f) => f.properties.status !== 'healthy')
    .sort((a, b) => rank[a.properties.status] - rank[b.properties.status])
    .map((f) => ({
      id: f.properties.id,
      title: `${f.properties.name}: ${reefStatus[f.properties.status].label.toLowerCase()}`,
      detail: `Coral ${f.properties.coral_cover_pct.toFixed(0)}% (${f.properties.change_12m_pct > 0 ? '+' : ''}${f.properties.change_12m_pct.toFixed(1)} pts in 12 months) · ${formatMonth(f.properties.latest_month)}`,
      time: `${f.properties.latest_month}-01T00:00:00Z`,
      severity: reefStatus[f.properties.status].severity,
      href: `/c3/${f.properties.id}`,
    }));
  return { ...result, data: { layer: result.data, alerts } };
}
