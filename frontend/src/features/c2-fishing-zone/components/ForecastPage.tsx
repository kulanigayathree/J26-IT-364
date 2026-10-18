import { useMemo, useState } from 'react';
import type { FeatureCollection, Point } from 'geojson';
import { Smartphone } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { eezLegendItem, GeoJSONLayer, MapLegend, MapStatus, MapView } from '@/components/map';
import {
  AsyncView,
  ButtonLink,
  Card,
  DataSourceNote,
  Disclaimer,
  PageHeader,
  SegmentedControl,
  Select,
  Toggle,
} from '@/components/ui';
import { mapStyles } from '@/design/mapStyles';
import { formatDateTime, formatPercent } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';
import { DEFAULT_PORT, fetchForecast, fetchPorts } from '../api';
import { manifest } from '../manifest';
import type { LeadTime } from '../types';
import { BestZonePanel } from './BestZonePanel';

const leadOptions: { value: LeadTime; label: string }[] = [
  { value: 24, label: '24 h' },
  { value: 48, label: '48 h' },
  { value: 72, label: '72 h' },
];

export function ForecastPage() {
  const [params, setParams] = useSearchParams();
  const portId = params.get('port') ?? DEFAULT_PORT;
  const [lead, setLead] = useState<LeadTime>(24);
  const [showUncertainty, setShowUncertainty] = useState(false);

  const ports = useAsync((signal) => fetchPorts(signal), []);
  const forecast = useAsync((signal) => fetchForecast(lead, portId, signal), [lead, portId]);

  const markers = useMemo<FeatureCollection<
    Point,
    { kind: 'port' | 'zone'; name: string }
  > | null>(() => {
    if (forecast.status !== 'success') return null;
    const zone = forecast.data.best_zone;
    const port =
      ports.status === 'success' ? ports.data.find((p) => p.id === zone.port_id) : undefined;
    return {
      type: 'FeatureCollection',
      features: [
        ...(port
          ? [
              {
                type: 'Feature' as const,
                id: 'port',
                geometry: { type: 'Point' as const, coordinates: [port.lon, port.lat] },
                properties: { kind: 'port' as const, name: port.name },
              },
            ]
          : []),
        {
          type: 'Feature',
          id: 'zone',
          geometry: { type: 'Point', coordinates: [zone.lon, zone.lat] },
          properties: { kind: 'zone', name: `Best zone from ${zone.port_name}` },
        },
      ],
    };
  }, [forecast, ports]);

  const uncertainCells = useMemo(() => {
    if (forecast.status !== 'success') return null;
    const features = forecast.data.cells.features.filter((f) => f.properties.uncertainty >= 0.2);
    return { ...forecast.data.cells, features };
  }, [forecast]);

  return (
    <>
      <PageHeader
        eyebrow="C2 · Fishing-zone prediction"
        title={manifest.title}
        subtitle="Probability of a good catch per grid cell, with the fuel-aware best zone for the chosen harbour."
        actions={
          <>
            <DataSourceNote state={forecast} />
            <ButtonLink to="/c2/fisher" variant="secondary" icon={Smartphone}>
              Fisher view
            </ButtonLink>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-4 rounded border border-line bg-paper-2 p-4 md:flex-row md:flex-wrap md:items-end">
        <SegmentedControl label="Lead time" options={leadOptions} value={lead} onChange={setLead} />
        <Select
          label="Harbour"
          className="md:w-64"
          value={portId}
          onChange={(value) => setParams({ port: value }, { replace: true })}
          disabled={ports.status !== 'success'}
          options={
            ports.status === 'success'
              ? ports.data.map((p) => ({ value: p.id, label: `${p.name} (${p.district})` }))
              : [{ value: portId, label: 'Loading harbours…' }]
          }
        />
        <Toggle
          label="Show uncertainty"
          description="Outline cells where the forecast is unsure"
          checked={showUncertainty}
          onChange={setShowUncertainty}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MapView
            label="Map of fishing-zone probability"
            height="lg"
            bleed
            overlay={
              <>
                <MapStatus states={[forecast]} />
                <MapLegend
                  title="Catch probability"
                  items={[
                    { label: 'Under 25%', color: 'coral', fillStep: 15 },
                    { label: '25–50%', color: 'coral', fillStep: 35 },
                    { label: '50–75%', color: 'coral', fillStep: 55 },
                    { label: 'Over 75%', color: 'coral', fillStep: 75 },
                    ...(showUncertainty
                      ? [
                          {
                            label: 'Uncertain (± 20% or more)',
                            color: 'navy' as const,
                            shape: 'outline' as const,
                          },
                        ]
                      : []),
                    { label: 'Best zone', color: 'navy', shape: 'dot', fillStep: 75 },
                    { label: 'Harbour', color: 'navy', shape: 'dot', fillStep: 15 },
                    eezLegendItem,
                  ]}
                />
              </>
            }
          >
            {forecast.status === 'success' && (
              <GeoJSONLayer
                data={forecast.data.cells}
                layerStyle={(f) => mapStyles.ramp(f.properties.probability, 'coral')}
                tooltip={(f) =>
                  `Catch probability ${formatPercent(f.properties.probability)} (± ${formatPercent(f.properties.uncertainty)})`
                }
              />
            )}
            {showUncertainty && uncertainCells && (
              <GeoJSONLayer
                data={uncertainCells}
                interactive={false}
                layerStyle={(f) => ({
                  stroke: 'navy',
                  dashed: true,
                  weight: f.properties.uncertainty >= 0.3 ? 'regular' : 'thin',
                })}
              />
            )}
            {markers && (
              <GeoJSONLayer
                data={markers}
                layerStyle={(f) =>
                  f.properties.kind === 'zone'
                    ? mapStyles.place({ fill: 'navy', radius: 9, weight: 'bold', stroke: 'coral' })
                    : mapStyles.place()
                }
                tooltip={(f) => f.properties.name}
              />
            )}
          </MapView>
        </div>

        <AsyncView
          state={forecast}
          loadingLabel="Loading forecast…"
          errorTitle="Could not load the forecast"
        >
          {(data) => (
            <div className="flex flex-col gap-4">
              <BestZonePanel zone={data.best_zone} modelVersion={data.model_version} />
              <Card tone="alt" headingLevel={3} title="Forecast window">
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-muted">Issued</dt>
                  <dd>{formatDateTime(data.issued_at)}</dd>
                  <dt className="text-muted">Valid from</dt>
                  <dd>{formatDateTime(data.valid_from)}</dd>
                  <dt className="text-muted">Valid to</dt>
                  <dd>{formatDateTime(data.valid_to)}</dd>
                  <dt className="text-muted">Grid</dt>
                  <dd>
                    {data.cell_size_deg}° cells · {data.cells.features.length}
                  </dd>
                </dl>
              </Card>
            </div>
          )}
        </AsyncView>
      </div>

      <Disclaimer kind="forecast" className="mt-6" />
    </>
  );
}
