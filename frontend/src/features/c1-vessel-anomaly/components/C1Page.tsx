import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { eezLegendItem, GeoJSONLayer, MapLegend, MapStatus, MapView } from '@/components/map';
import {
  AsyncView,
  Card,
  DataSourceNote,
  Disclaimer,
  EmptyState,
  PageHeader,
  Section,
  Select,
  SeverityBadge,
  StatTile,
} from '@/components/ui';
import { mapStyles } from '@/design/mapStyles';
import { formatDateTime, formatPosition } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';
import { fetchAnomalies, fetchTracks } from '../api';
import { manifest } from '../manifest';
import type { AnomalyType } from '../types';
import { AnomalyTable } from './AnomalyTable';
import { anomalyLabel } from './labels';

type TypeFilter = 'all' | AnomalyType;

const typeOptions: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All types' },
  ...(Object.keys(anomalyLabel) as AnomalyType[]).map((value) => ({
    value,
    label: anomalyLabel[value],
  })),
];

export function C1Page() {
  const tracks = useAsync((signal) => fetchTracks(signal), []);
  const anomalies = useAsync((signal) => fetchAnomalies(signal), []);
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('anomaly');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const select = (id: string) => setParams({ anomaly: id }, { replace: true });

  const filtered = useMemo(() => {
    if (anomalies.status !== 'success') return null;
    const features = anomalies.data.features.filter(
      (f) => typeFilter === 'all' || f.properties.anomaly_type === typeFilter,
    );
    return { ...anomalies.data, features };
  }, [anomalies, typeFilter]);

  const selected = filtered?.features.find((f) => f.properties.id === selectedId) ?? null;

  return (
    <>
      <PageHeader
        eyebrow="C1 · Vessel behaviour"
        title={manifest.title}
        subtitle="Vessel tracks from AIS with anomalies scored by the C1 model, including SAR detections that have no AIS match."
        actions={<DataSourceNote state={anomalies} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MapView
            label="Map of vessel tracks and anomaly alerts"
            height="lg"
            bleed
            overlay={
              <>
                <MapStatus states={[tracks, anomalies]} />
                <MapLegend
                  items={[
                    { label: 'Vessel track (AIS)', color: 'sea', shape: 'line' },
                    { label: 'High severity', color: 'coral-text', shape: 'dot' },
                    { label: 'Medium severity', color: 'amber', shape: 'dot' },
                    { label: 'Low severity', color: 'reef-green', shape: 'dot' },
                    eezLegendItem,
                  ]}
                />
              </>
            }
          >
            {tracks.status === 'success' && (
              <GeoJSONLayer
                data={tracks.data}
                layerStyle={mapStyles.track('sea')}
                tooltip={(f) =>
                  `${f.properties.vessel_name} · ${f.properties.vessel_type} (${f.properties.flag})`
                }
              />
            )}
            {filtered && (
              <GeoJSONLayer
                data={filtered}
                layerStyle={(f) => mapStyles.severity(f.properties.severity)}
                selectedId={selectedId}
                getId={(f) => f.properties.id}
                onSelect={(f) => select(f.properties.id)}
                tooltip={(f) =>
                  `${anomalyLabel[f.properties.anomaly_type]} · ${f.properties.vessel_name} · score ${f.properties.score.toFixed(2)}`
                }
              />
            )}
          </MapView>
        </div>

        <div className="flex flex-col gap-4">
          <AsyncView state={anomalies} compact loadingLabel="Loading anomalies…">
            {(data) => {
              const high = data.features.filter((f) => f.properties.severity === 'high').length;
              const sar = data.features.filter((f) => f.properties.source !== 'AIS').length;
              return (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-1 xl:grid-cols-2">
                  <StatTile
                    label="Open alerts"
                    value={data.features.length}
                    source="C1 model, last 48 h"
                  />
                  <StatTile label="High severity" value={high} emphasis />
                  <StatTile label="SAR-based" value={sar} source="Sentinel-1" />
                  <StatTile
                    label="Vessels tracked"
                    value={tracks.status === 'success' ? tracks.data.features.length : '—'}
                    source="AIS"
                  />
                </div>
              );
            }}
          </AsyncView>

          <Card title="Selected alert" headingLevel={3}>
            {selected ? (
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge level={selected.properties.severity} />
                  <span className="font-bold text-navy">
                    {anomalyLabel[selected.properties.anomaly_type]}
                  </span>
                </div>
                <p className="font-bold">
                  {selected.properties.vessel_name}{' '}
                  <span className="font-normal text-muted">MMSI {selected.properties.mmsi}</span>
                </p>
                <p className="font-serif">{selected.properties.description}</p>
                <p className="text-muted">
                  {formatPosition(selected.geometry.coordinates)} ·{' '}
                  {formatDateTime(selected.properties.detected_at)} · {selected.properties.source}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">Select an alert on the map or in the table.</p>
            )}
          </Card>
        </div>
      </div>

      <Section
        title="Anomaly alerts"
        description="Sorted by score. Select a row to show it on the map."
        actions={
          <Select
            label="Anomaly type"
            options={typeOptions}
            value={typeFilter}
            onChange={setTypeFilter}
            className="w-48"
          />
        }
      >
        <AsyncView
          state={anomalies}
          isEmpty={(data) => data.features.length === 0}
          loadingLabel="Loading anomaly alerts…"
          empty={{
            title: 'No anomalies',
            message: 'No unusual vessel behaviour was flagged in this period.',
          }}
        >
          {() =>
            filtered && filtered.features.length > 0 ? (
              <AnomalyTable rows={filtered.features} selectedId={selectedId} onSelect={select} />
            ) : (
              <EmptyState
                title="No alerts of this type"
                message="Choose “All types” to see every alert."
              />
            )
          }
        </AsyncView>
      </Section>

      <Disclaimer kind="anomaly" className="mt-6" />
    </>
  );
}
