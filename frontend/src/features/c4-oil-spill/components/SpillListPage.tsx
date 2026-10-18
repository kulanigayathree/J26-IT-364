import { useMemo, useState } from 'react';
import type { Feature, Polygon } from 'geojson';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { eezLegendItem, GeoJSONLayer, MapLegend, MapStatus, MapView } from '@/components/map';
import {
  AsyncView,
  Badge,
  Button,
  DataSourceNote,
  DataTable,
  DatePicker,
  Disclaimer,
  EmptyState,
  PageHeader,
  Section,
  SeverityBadge,
  type Column,
} from '@/components/ui';
import { mapStyles } from '@/design/mapStyles';
import { formatDate, formatDateTime, formatPercent, toDateInput } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';
import { fetchSpills } from '../api';
import { manifest } from '../manifest';
import type { SpillProperties } from '../types';
import { spillStatus } from './labels';

type SpillFeature = Feature<Polygon, SpillProperties>;

const columns: Column<SpillFeature>[] = [
  {
    key: 'location',
    header: 'Location',
    cell: (f) => f.properties.location_name,
    sortValue: (f) => f.properties.location_name,
  },
  {
    key: 'detected',
    header: 'Detected',
    cell: (f) => formatDateTime(f.properties.detected_at),
    sortValue: (f) => f.properties.detected_at,
  },
  {
    key: 'severity',
    header: 'Severity',
    cell: (f) => <SeverityBadge level={f.properties.severity} />,
    sortValue: (f) => ({ low: 0, medium: 1, high: 2 })[f.properties.severity],
  },
  {
    key: 'area',
    header: 'Area',
    align: 'right',
    cell: (f) => `${f.properties.area_km2.toFixed(1)} km²`,
    sortValue: (f) => f.properties.area_km2,
  },
  {
    key: 'confidence',
    header: 'Confidence',
    align: 'right',
    cell: (f) => formatPercent(f.properties.confidence),
    sortValue: (f) => f.properties.confidence,
  },
  {
    key: 'status',
    header: 'Status',
    cell: (f) => (
      <Badge tone={spillStatus[f.properties.status].tone}>
        {spillStatus[f.properties.status].label}
      </Badge>
    ),
  },
  {
    key: 'candidates',
    header: 'Candidates',
    align: 'right',
    cell: (f) => f.properties.candidate_count,
    hideOnMobile: true,
  },
];

const DAY = 24 * 60 * 60 * 1000;

export function SpillListPage() {
  const spills = useAsync((signal) => fetchSpills(signal), []);
  const navigate = useNavigate();
  // Default: the last 90 days.
  const [from, setFrom] = useState(() => toDateInput(new Date(Date.now() - 90 * DAY)));
  const [to, setTo] = useState(() => toDateInput(new Date()));

  const filtered = useMemo(() => {
    if (spills.status !== 'success') return null;
    const features = spills.data.features.filter((f) => {
      const day = f.properties.detected_at.slice(0, 10);
      return (!from || day >= from) && (!to || day <= to);
    });
    return { ...spills.data, features };
  }, [spills, from, to]);

  const clearDates = () => {
    setFrom('');
    setTo('');
  };

  return (
    <>
      <PageHeader
        eyebrow="C4 · Oil spills"
        title={manifest.title}
        subtitle="Possible oil slicks detected in Sentinel-1 SAR images. Open a detection to see the ranked candidate vessels and their evidence."
        actions={<DataSourceNote state={spills} />}
      />

      <div className="mb-4 flex flex-col gap-4 rounded border border-line bg-paper-2 p-4 sm:flex-row sm:items-end">
        <DatePicker
          label="Detected from"
          value={from}
          max={to || undefined}
          onChange={setFrom}
          className="sm:w-48"
        />
        <DatePicker
          label="Detected to"
          value={to}
          min={from || undefined}
          onChange={setTo}
          className="sm:w-48"
        />
        <Button variant="ghost" icon={X} onClick={clearDates} disabled={!from && !to}>
          Clear dates
        </Button>
      </div>

      <MapView
        label="Map of detected oil slicks"
        height="md"
        bleed
        overlay={
          <>
            <MapStatus states={[spills]} />
            <MapLegend
              items={[
                { label: 'High severity slick', color: 'coral-text' },
                { label: 'Medium severity slick', color: 'amber' },
                { label: 'Low severity slick', color: 'reef-green' },
                eezLegendItem,
              ]}
            />
          </>
        }
      >
        {filtered && (
          <GeoJSONLayer
            data={filtered}
            layerStyle={(f) => mapStyles.severity(f.properties.severity)}
            onSelect={(f) => navigate(`/c4/${f.properties.id}`)}
            tooltip={(f) =>
              `${f.properties.location_name} · ${formatDate(f.properties.detected_at)} · ${f.properties.area_km2} km²`
            }
          />
        )}
      </MapView>

      <Section
        title="Spill detections"
        description="Newest first. Select a detection for candidate vessels."
      >
        <AsyncView
          state={spills}
          isEmpty={(d) => d.features.length === 0}
          loadingLabel="Loading spill detections…"
          empty={{
            title: 'No spills detected',
            message: 'No oil slicks were found in the processed SAR images.',
          }}
        >
          {() =>
            filtered && filtered.features.length > 0 ? (
              <DataTable
                caption="Oil spill detections"
                columns={columns}
                rows={filtered.features}
                getRowId={(f) => f.properties.id}
                onRowClick={(f) => navigate(`/c4/${f.properties.id}`)}
                initialSort={{ key: 'detected', direction: 'desc' }}
              />
            ) : (
              <EmptyState
                title="No spills in these dates"
                message={`Nothing was detected between ${from ? formatDate(from) : 'the start'} and ${to ? formatDate(to) : 'today'}.`}
                action={
                  <Button variant="secondary" size="sm" onClick={clearDates}>
                    Show all dates
                  </Button>
                }
              />
            )
          }
        </AsyncView>
      </Section>

      <Disclaimer kind="satellite" className="mt-6">
        Slicks are detected automatically from radar images. Look-alikes (low wind, algal films) are
        possible until an analyst or field team confirms them.
      </Disclaimer>
    </>
  );
}
