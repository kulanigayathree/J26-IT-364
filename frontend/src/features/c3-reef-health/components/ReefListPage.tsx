import type { Feature, Point } from 'geojson';
import { useNavigate } from 'react-router-dom';
import { eezLegendItem, GeoJSONLayer, MapLegend, MapStatus, MapView } from '@/components/map';
import {
  AsyncView,
  Badge,
  DataSourceNote,
  DataTable,
  Disclaimer,
  PageHeader,
  Section,
  StatTile,
  type Column,
} from '@/components/ui';
import { mapStyles } from '@/design/mapStyles';
import { formatMonth } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';
import { fetchReefs } from '../api';
import { manifest } from '../manifest';
import type { ReefProperties } from '../types';
import { reefStatus } from './status';

type ReefFeature = Feature<Point, ReefProperties>;

const signed = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}`;

const columns: Column<ReefFeature>[] = [
  {
    key: 'name',
    header: 'Reef',
    cell: (f) => f.properties.name,
    sortValue: (f) => f.properties.name,
  },
  {
    key: 'region',
    header: 'Region',
    cell: (f) => f.properties.region,
    sortValue: (f) => f.properties.region,
  },
  {
    key: 'status',
    header: 'Status',
    cell: (f) => (
      <Badge tone={reefStatus[f.properties.status].tone}>
        {reefStatus[f.properties.status].label}
      </Badge>
    ),
    sortValue: (f) => ({ degraded: 0, watch: 1, healthy: 2 })[f.properties.status],
  },
  {
    key: 'coral',
    header: 'Coral cover',
    align: 'right',
    cell: (f) => `${f.properties.coral_cover_pct.toFixed(1)}%`,
    sortValue: (f) => f.properties.coral_cover_pct,
  },
  {
    key: 'change',
    header: '12-month change',
    align: 'right',
    cell: (f) => `${signed(f.properties.change_12m_pct)} pts`,
    sortValue: (f) => f.properties.change_12m_pct,
  },
  {
    key: 'dhw',
    header: 'Max heat stress',
    align: 'right',
    cell: (f) => `${f.properties.max_dhw_12m.toFixed(1)} DHW`,
    sortValue: (f) => f.properties.max_dhw_12m,
  },
  {
    key: 'month',
    header: 'Latest image',
    cell: (f) => formatMonth(f.properties.latest_month),
    hideOnMobile: true,
  },
];

export function ReefListPage() {
  const reefs = useAsync((signal) => fetchReefs(signal), []);
  const navigate = useNavigate();

  return (
    <>
      <PageHeader
        eyebrow="C3 · Reef health"
        title={manifest.title}
        subtitle="Benthic cover per reef from monthly cloud-free satellite composites. Select a reef for its time series and heat-stress comparison."
        actions={<DataSourceNote state={reefs} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MapView
            label="Map of monitored reefs coloured by status"
            height="md"
            bleed
            overlay={
              <>
                <MapStatus states={[reefs]} />
                <MapLegend
                  items={[
                    { label: 'Healthy', color: 'reef-green', shape: 'dot' },
                    { label: 'Watch', color: 'amber', shape: 'dot' },
                    { label: 'Degraded', color: 'coral-text', shape: 'dot' },
                    eezLegendItem,
                  ]}
                />
              </>
            }
          >
            {reefs.status === 'success' && (
              <GeoJSONLayer
                data={reefs.data}
                layerStyle={(f) =>
                  mapStyles.severity(reefStatus[f.properties.status].severity, { radius: 8 })
                }
                onSelect={(f) => navigate(`/c3/${f.properties.id}`)}
                tooltip={(f) =>
                  `${f.properties.name} · ${reefStatus[f.properties.status].label} · coral ${f.properties.coral_cover_pct.toFixed(0)}%`
                }
              />
            )}
          </MapView>
        </div>
        <AsyncView state={reefs} compact>
          {(data) => {
            const count = (s: ReefProperties['status']) =>
              data.features.filter((f) => f.properties.status === s).length;
            const mean =
              data.features.reduce((sum, f) => sum + f.properties.coral_cover_pct, 0) /
              Math.max(1, data.features.length);
            return (
              <div className="grid grid-cols-2 gap-4 self-start">
                <StatTile label="Reefs monitored" value={data.features.length} />
                <StatTile
                  label="Mean coral cover"
                  value={mean.toFixed(1)}
                  unit="%"
                  source="Sentinel-2"
                />
                <StatTile label="Degraded" value={count('degraded')} emphasis />
                <StatTile label="On watch" value={count('watch')} />
              </div>
            );
          }}
        </AsyncView>
      </div>

      <Section title="Reefs" description="Select a reef to open its detail page.">
        <AsyncView
          state={reefs}
          isEmpty={(d) => d.features.length === 0}
          loadingLabel="Loading reefs…"
          empty={{
            title: 'No reefs yet',
            message: 'No reef has a cloud-free composite for this period.',
          }}
        >
          {(data) => (
            <DataTable
              caption="Monitored reefs"
              columns={columns}
              rows={data.features}
              getRowId={(f) => f.properties.id}
              onRowClick={(f) => navigate(`/c3/${f.properties.id}`)}
              initialSort={{ key: 'status', direction: 'asc' }}
            />
          )}
        </AsyncView>
      </Section>

      <Disclaimer kind="satellite" className="mt-6" />
    </>
  );
}
