import { useMemo, useState } from 'react';
import type { FeatureCollection, Polygon } from 'geojson';
import { useParams } from 'react-router-dom';
import { eezLegendItem, GeoJSONLayer, MapLegend, MapView } from '@/components/map';
import {
  AsyncView,
  Badge,
  Card,
  DataSourceNote,
  Disclaimer,
  PageHeader,
  SeverityBadge,
  StatTile,
} from '@/components/ui';
import { mapStyles } from '@/design/mapStyles';
import { formatDateTime, formatPercent } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';
import { fetchSpill } from '../api';
import type { SpillProperties } from '../types';
import { CandidateList } from './CandidateList';
import { spillStatus } from './labels';

export function SpillDetailPage() {
  const { spillId = '' } = useParams();
  const detail = useAsync((signal) => fetchSpill(spillId, signal), [spillId]);
  const [selectedMmsi, setSelectedMmsi] = useState<string | null>(null);

  const slick = useMemo<FeatureCollection<Polygon, SpillProperties> | null>(
    () =>
      detail.status === 'success'
        ? { type: 'FeatureCollection', features: [detail.data.spill] }
        : null,
    [detail],
  );

  const spill = detail.status === 'success' ? detail.data.spill.properties : null;

  return (
    <>
      <PageHeader
        eyebrow="C4 · Oil spills"
        title={spill ? `Possible slick · ${spill.location_name}` : 'Spill detection'}
        back={{ to: '/c4', label: 'All detections' }}
        subtitle={
          spill ? `${spill.id} · ${spill.sensor} · ${formatDateTime(spill.detected_at)}` : undefined
        }
        actions={<DataSourceNote state={detail} />}
      />

      <Disclaimer kind="candidate" className="mb-6" />

      <AsyncView
        state={detail}
        loadingLabel="Loading detection…"
        errorTitle="Could not load this detection"
      >
        {(data) => {
          const p = data.spill.properties;
          return (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatTile label="Slick area" value={p.area_km2.toFixed(1)} unit="km²" emphasis />
                <StatTile
                  label="Detector confidence"
                  value={formatPercent(p.confidence)}
                  source={p.sensor}
                />
                <StatTile label="Severity" value={<SeverityBadge level={p.severity} long />} />
                <StatTile
                  label="Status"
                  value={
                    <Badge tone={spillStatus[p.status].tone}>{spillStatus[p.status].label}</Badge>
                  }
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <MapView
                  label="Map of the slick and candidate vessel tracks"
                  height="lg"
                  bleed
                  overlay={
                    <MapLegend
                      items={[
                        { label: 'Detected slick', color: mapStyles.severity(p.severity).stroke },
                        { label: 'Candidate track', color: 'sea', shape: 'line' },
                        { label: 'Selected candidate', color: 'navy', shape: 'line' },
                        eezLegendItem,
                      ]}
                    />
                  }
                >
                  {slick && (
                    <GeoJSONLayer
                      data={slick}
                      layerStyle={mapStyles.severity(p.severity)}
                      fitToData
                      interactive={false}
                    />
                  )}
                  <GeoJSONLayer
                    data={data.candidate_tracks}
                    layerStyle={mapStyles.track('sea', { weight: 'regular' })}
                    getId={(f) => f.properties.mmsi}
                    selectedId={selectedMmsi}
                    onSelect={(f) => setSelectedMmsi(f.properties.mmsi)}
                    tooltip={(f) => `#${f.properties.rank} ${f.properties.vessel_name} (candidate)`}
                  />
                </MapView>

                <Card
                  title="Ranked candidate vessels"
                  description="Ordered by attribution score. Select one to highlight its track."
                >
                  {data.candidates.length > 0 ? (
                    <CandidateList
                      candidates={data.candidates}
                      selectedMmsi={selectedMmsi}
                      onSelect={setSelectedMmsi}
                    />
                  ) : (
                    <p className="text-sm text-muted">
                      No AIS track matched this slick in space and time.
                    </p>
                  )}
                  <p className="mt-4 font-serif text-sm text-muted">{data.attribution_method}</p>
                </Card>
              </div>
            </div>
          );
        }}
      </AsyncView>
    </>
  );
}
