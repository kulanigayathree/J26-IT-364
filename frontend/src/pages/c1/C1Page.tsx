import { useMemo, useState } from 'react';
import { getC1Data } from '../../api/c1';
import { useApi } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { DetailList, Legend, ModelPage } from '../../components/ModelPage';
import { SeaMap, niceGraticule, niceScaleKm } from '../../components/SeaMap';
import { SectionTitle, SeverityBadge, StatRow } from '../../components/ui';
import { boundsAround, type LonLat } from '../../data/geo';
import { formatDateTime, formatLatLon } from '../../format';
import { severityColor } from '../../theme';
import type { Anomaly, C1Data } from '../../types/c1';
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
  return (
    <ModelPage
      id="c1"
      state={state}
      isEmpty={(d) => d.vessels.length === 0 && d.anomalies.length === 0}
      emptyMessage="No vessel data yet. The C1 model has not exported any results."
    >
      {(data) => <C1Content data={data} />}
    </ModelPage>
  );
}

function C1Content({ data }: { data: C1Data }) {
  const [selected, setSelected] = useState<string | null>(null);
  const bounds = useMemo(() => {
    const pts: LonLat[] = [...data.vessels.map((v) => [v.lon, v.lat] as LonLat), ...data.anomalies.map((a) => [a.lon, a.lat] as LonLat)];
    return boundsAround(pts, 0.8, 3);
  }, [data]);
  const chosen = data.anomalies.find((a) => a.id === selected);

  return (
    <>
      <AnalysePanel />

      <StatRow
        items={[
          { label: 'Anomalies today', value: data.summary.anomalies_today, note: 'last 24 h' },
          { label: 'High severity', value: data.summary.high_severity },
          { label: 'Vessels tracked', value: data.summary.vessels_tracked },
          { label: 'All anomalies', value: data.summary.total_anomalies },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-12">
        <figure className="lg:col-span-7">
          <div className="overflow-hidden rounded-[4px] border border-line">
            <SeaMap
              bounds={bounds}
              graticule={niceGraticule(bounds)}
              scaleKm={niceScaleKm(bounds)}
              label="Map of vessel positions and detected anomalies"
              over={(P) => (
                <g>
                  {data.vessels.map((v) => {
                    const [x, y] = P.project([v.lon, v.lat]);
                    return (
                      <circle key={v.vessel_id} cx={x} cy={y} r="4" fill="#12405a">
                        <title>{`${v.name} (${v.vessel_id}) · ${v.type}`}</title>
                      </circle>
                    );
                  })}
                  {data.anomalies.map((a) => {
                    const [x, y] = P.project([a.lon, a.lat]);
                    const r = 6 + a.score * 8;
                    return (
                      <g key={a.id} onClick={() => setSelected(a.id)} className="cursor-pointer">
                        <title>{`${typeLabel(a.anomaly_type)} · ${a.vessel_name} · score ${a.score.toFixed(2)}`}</title>
                        {selected === a.id && <circle cx={x} cy={y} r={r + 6} fill="none" stroke="#12222d" strokeWidth="2" />}
                        <circle cx={x} cy={y} r={r} fill={severityColor[a.severity]} fillOpacity="0.85" stroke="#fff" strokeWidth="1.5" />
                      </g>
                    );
                  })}
                </g>
              )}
            />
          </div>
          <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-muted">
            <Legend swatch="bg-deep-2" label="Vessel position" />
            <Legend swatch="bg-coral" label="High severity" />
            <Legend swatch="bg-amber" label="Medium severity" />
            <Legend swatch="bg-tide" label="Low severity" />
          </figcaption>
        </figure>

        <div className="lg:col-span-5">
          {chosen ? (
            <SelectedAnomaly anomaly={chosen} onClear={() => setSelected(null)} />
          ) : (
            <p className="border-t border-line pt-4 text-[14px] leading-[1.65] text-muted">
              Select an anomaly on the map or in the table to see its details. Larger markers have higher scores.
            </p>
          )}
        </div>
      </div>

      <section>
        <SectionTitle>Anomalies</SectionTitle>
        <DataTable<Anomaly>
          caption="Vessel anomalies"
          rows={data.anomalies}
          rowKey={(a) => a.id}
          selectedKey={selected}
          onRowClick={(a) => setSelected(a.id)}
          minWidth="min-w-[760px]"
          columns={[
            { header: 'Vessel ID', cell: (a) => <span title={a.vessel_name}>{a.vessel_id}</span>, mono: true },
            { header: 'Anomaly type', cell: (a) => typeLabel(a.anomaly_type) },
            { header: 'Severity', cell: (a) => <SeverityBadge level={a.severity} /> },
            { header: 'Score', cell: (a) => a.score.toFixed(2), numeric: true, mono: true },
            { header: 'Time', cell: (a) => formatDateTime(a.time) },
            { header: 'Location', cell: (a) => formatLatLon(a.lat, a.lon), mono: true },
          ]}
        />
      </section>
    </>
  );
}

function SelectedAnomaly({ anomaly: a, onClear }: { anomaly: Anomaly; onClear: () => void }) {
  return (
    <div className="border-t-2 border-deep pt-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[12px] text-muted">
            Vessel {a.vessel_id} · {a.vessel_name}
          </p>
          <h3 className="mt-1 font-display text-[24px] leading-tight text-deep">{typeLabel(a.anomaly_type)}</h3>
        </div>
        <SeverityBadge level={a.severity} />
      </div>
      <div className="mt-5">
        <DetailList
          rows={[
            ['Score', a.score.toFixed(2)],
            ['Time', formatDateTime(a.time)],
            ['Location', formatLatLon(a.lat, a.lon)],
          ]}
        />
      </div>
      {a.description && <p className="mt-4 text-[14px] leading-[1.65] text-ink/80">{a.description}</p>}
      <button type="button" onClick={onClear} className="mt-4 text-[13.5px] font-medium text-tide hover:text-deep">
        Clear selection
      </button>
    </div>
  );
}
