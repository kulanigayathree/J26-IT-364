import { useMemo } from 'react';
import type { FeatureCollection, Point } from 'geojson';
import { useParams } from 'react-router-dom';
import { GeoJSONLayer, MapView } from '@/components/map';
import {
  AsyncView,
  Badge,
  Card,
  DataSourceNote,
  DataTable,
  Disclaimer,
  PageHeader,
  StatTile,
} from '@/components/ui';
import { mapStyles } from '@/design/mapStyles';
import { formatLatLon, formatMonth } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';
import { fetchReef } from '../api';
import type { MonthlyCover } from '../types';
import { CoverChart } from './CoverChart';
import { HeatStressChart } from './HeatStressChart';
import { reefStatus } from './status';

const value = (v: number | null) => (v === null ? '—' : `${v.toFixed(1)}%`);

export function ReefDetailPage() {
  const { reefId = '' } = useParams();
  const reef = useAsync((signal) => fetchReef(reefId, signal), [reefId]);

  const point = useMemo<FeatureCollection<Point> | null>(
    () =>
      reef.status === 'success'
        ? {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                id: reefId,
                geometry: { type: 'Point', coordinates: [reef.data.lon, reef.data.lat] },
                properties: {},
              },
            ],
          }
        : null,
    [reef, reefId],
  );

  const title = reef.status === 'success' ? reef.data.name : 'Reef detail';

  return (
    <>
      <PageHeader
        eyebrow="C3 · Reef health"
        title={title}
        back={{ to: '/c3', label: 'All reefs' }}
        subtitle={
          reef.status === 'success'
            ? `${reef.data.region} · ${formatLatLon(reef.data.lat, reef.data.lon)}`
            : undefined
        }
        actions={<DataSourceNote state={reef} />}
      />

      <AsyncView
        state={reef}
        loadingLabel="Loading reef…"
        errorTitle="Could not load this reef"
        isEmpty={(d) => d.series.length === 0}
        empty={{
          title: 'No observations yet',
          message: 'This reef has no cloud-free satellite composites yet.',
        }}
      >
        {(data) => {
          const status = reefStatus[data.status];
          return (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatTile
                  label="Coral cover"
                  value={data.coral_cover_pct.toFixed(1)}
                  unit="%"
                  emphasis
                  note={<Badge tone={status.tone}>{status.label}</Badge>}
                  source={formatMonth(data.latest_month)}
                />
                <StatTile
                  label="12-month change"
                  value={`${data.change_12m_pct > 0 ? '+' : ''}${data.change_12m_pct.toFixed(1)}`}
                  unit="pts"
                />
                <StatTile label="Algae cover" value={data.algae_cover_pct.toFixed(1)} unit="%" />
                <StatTile
                  label="Max heat stress"
                  value={data.max_dhw_12m.toFixed(1)}
                  unit="DHW"
                  source="last 12 months"
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <Card
                  className="lg:col-span-2"
                  title="Benthic cover by month"
                  description="Share of the reef area classified as coral, algae and sand/rubble. Gaps: no cloud-free image."
                >
                  <CoverChart series={data.series} />
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-bold text-sea">
                      Show the numbers
                    </summary>
                    <div className="mt-3">
                      <DataTable<MonthlyCover>
                        caption="Monthly benthic cover"
                        rows={[...data.series].reverse()}
                        getRowId={(r) => r.month}
                        columns={[
                          { key: 'month', header: 'Month', cell: (r) => formatMonth(r.month) },
                          {
                            key: 'coral',
                            header: 'Coral',
                            align: 'right',
                            cell: (r) => value(r.coral_pct),
                          },
                          {
                            key: 'algae',
                            header: 'Algae',
                            align: 'right',
                            cell: (r) => value(r.algae_pct),
                          },
                          {
                            key: 'sand',
                            header: 'Sand / rubble',
                            align: 'right',
                            cell: (r) => value(r.sand_rubble_pct),
                          },
                          {
                            key: 'obs',
                            header: 'Cloud-free images',
                            align: 'right',
                            cell: (r) => r.cloud_free_obs,
                          },
                        ]}
                      />
                    </div>
                  </details>
                </Card>
                <Card title="Location" padding="none">
                  {point && (
                    <MapView
                      label={`Location of ${data.name}`}
                      height="sm"
                      center={[data.lat, data.lon]}
                      zoom={10}
                    >
                      <GeoJSONLayer
                        data={point}
                        layerStyle={mapStyles.severity(status.severity, { radius: 9 })}
                      />
                    </MapView>
                  )}
                  <p className="p-4 font-serif text-sm text-muted">{data.method_note}</p>
                </Card>
              </div>

              <Card
                title="Heat-stress comparison"
                description="Degree heating weeks (DHW) each month this year, against the same month last year."
              >
                <HeatStressChart months={data.heat_stress} />
              </Card>
            </div>
          );
        }}
      </AsyncView>

      <Disclaimer kind="satellite" className="mt-6" />
    </>
  );
}
