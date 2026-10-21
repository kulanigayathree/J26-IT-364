import { useState } from 'react';
import { CircleMarker, Tooltip } from 'react-leaflet';
import { getC1Data } from '../../api/c1';
import { useApi } from '../../api/client';
import { ComponentPage, StatRow } from '../../components/ComponentPage';
import { DataTable } from '../../components/DataTable';
import { MapLegend } from '../../components/MapLegend';
import { MapView } from '../../components/MapView';
import { SeverityBadge } from '../../components/SeverityBadge';
import { StatCard } from '../../components/StatCard';
import { formatDateTime, formatLatLon } from '../../format';
import { colors, severityColor } from '../../theme';
import type { Anomaly } from '../../types/c1';
import { AnalysePanel } from './AnalysePanel';

const TYPE_LABEL: Record<string, string> = {
  ais_gap: 'AIS gap',
  loitering: 'Loitering',
  speed_change: 'Speed change',
  route_deviation: 'Route deviation',
  dark_vessel: 'Dark vessel (SAR)',
};
const typeLabel = (t: string) => TYPE_LABEL[t] ?? t;

export default function C1Page() {
  const state = useApi(getC1Data, []);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <ComponentPage
      code="C1"
      title="Vessel Behaviour Anomaly Detection"
      description="Vessel positions from AIS and anomalies found by the C1 model, including radar (SAR) detections with no AIS signal."
      state={state}
      isEmpty={(d) => d.vessels.length === 0 && d.anomalies.length === 0}
      emptyMessage="No vessel data yet. The C1 model has not exported any results."
      disclaimer="Model output – not field-confirmed. An anomaly is a reason to look closer, not evidence of illegal activity."
    >
      {(data) => (
        <>
          <AnalysePanel />

          <StatRow>
            <StatCard label="Anomalies today" value={data.summary.anomalies_today} note="last 24 h" />
            <StatCard label="High severity" value={data.summary.high_severity} />
            <StatCard label="Vessels tracked" value={data.summary.vessels_tracked} />
            <StatCard label="All anomalies" value={data.summary.total_anomalies} />
          </StatRow>

          <section>
            <MapView label="Map of vessel positions and anomalies" height="lg">
              {data.vessels.map((v) => (
                <CircleMarker
                  key={v.vessel_id}
                  center={[v.lat, v.lon]}
                  radius={4}
                  pathOptions={{ color: colors.sea, fillColor: colors.sea, fillOpacity: 0.6, weight: 1 }}
                >
                  <Tooltip>
                    {v.name} ({v.vessel_id}) · {v.type}
                  </Tooltip>
                </CircleMarker>
              ))}
              {data.anomalies.map((a) => (
                <CircleMarker
                  key={a.id}
                  center={[a.lat, a.lon]}
                  radius={selected === a.id ? 11 : 8}
                  eventHandlers={{ click: () => setSelected(a.id) }}
                  pathOptions={{
                    color: selected === a.id ? colors.navy : severityColor[a.severity],
                    fillColor: severityColor[a.severity],
                    fillOpacity: 0.7,
                    weight: selected === a.id ? 3 : 2,
                  }}
                >
                  <Tooltip>
                    {typeLabel(a.anomaly_type)} · {a.vessel_name} · {a.severity} ({a.score.toFixed(2)})
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapView>
            <MapLegend
              items={[
                { label: 'Vessel position', swatch: 'border-sea bg-sea' },
                { label: 'High severity', swatch: 'border-coral-text bg-coral-text' },
                { label: 'Medium severity', swatch: 'border-amber bg-amber' },
                { label: 'Low severity', swatch: 'border-reef-green bg-reef-green' },
              ]}
            />
          </section>

          <section>
            <h2 className="mb-3 text-xl">Anomalies</h2>
            <DataTable<Anomaly>
              caption="Vessel anomalies"
              rows={data.anomalies}
              rowKey={(a) => a.id}
              selectedKey={selected}
              onRowClick={(a) => setSelected(a.id)}
              columns={[
                { header: 'Vessel ID', cell: (a) => <span title={a.vessel_name}>{a.vessel_id}</span> },
                { header: 'Anomaly type', cell: (a) => typeLabel(a.anomaly_type) },
                { header: 'Severity', cell: (a) => <SeverityBadge level={a.severity} /> },
                { header: 'Score', cell: (a) => a.score.toFixed(2), numeric: true },
                { header: 'Time', cell: (a) => formatDateTime(a.time) },
                { header: 'Location', cell: (a) => formatLatLon(a.lat, a.lon) },
              ]}
            />
            {selected && (
              <p className="mt-3 rounded border border-line bg-paper-2 p-3 font-serif text-sm">
                {data.anomalies.find((a) => a.id === selected)?.description}
              </p>
            )}
          </section>
        </>
      )}
    </ComponentPage>
  );
}
