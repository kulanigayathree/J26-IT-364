import { useMemo, useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { Polygon, Tooltip } from 'react-leaflet';
import { getC4Data } from '../../api/c4';
import { useApi } from '../../api/client';
import { ComponentPage, StatRow } from '../../components/ComponentPage';
import { DataTable } from '../../components/DataTable';
import { MapLegend } from '../../components/MapLegend';
import { FitBounds, MapView } from '../../components/MapView';
import { SeverityBadge, Tag } from '../../components/SeverityBadge';
import { StatCard } from '../../components/StatCard';
import { formatDateTime, percent } from '../../format';
import { colors, severityColor } from '../../theme';
import type { Candidate, Spill } from '../../types/c4';
import { DetectPanel } from './DetectPanel';

export default function C4Page() {
  const state = useApi(getC4Data, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <ComponentPage
      code="C4"
      title="Oil-Spill Detection and Vessel Attribution"
      description="Possible oil slicks found in Sentinel-1 radar images, with vessels that may be the source ranked by AIS evidence."
      state={state}
      isEmpty={(d) => d.spills.length === 0}
      emptyMessage="No spill alerts yet. The C4 model has not exported any detections."
      disclaimer="Model output – not field-confirmed. Candidate vessels are candidates, not proof; attribution must be verified by the authorities."
    >
      {(data) => (
        <>
          <DetectPanel />
          <SpillView spills={data.spills} summary={data.summary} selectedId={selectedId} onSelect={setSelectedId} />
        </>
      )}
    </ComponentPage>
  );
}

function SpillView({
  spills,
  summary,
  selectedId,
  onSelect,
}: {
  spills: Spill[];
  summary: { active: number; total: number; high_severity: number; candidate_vessels: number };
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const selected = spills.find((s) => s.id === selectedId) ?? spills[0];
  const bounds = useMemo(
    () => (selected ? selected.polygon.map(([lon, lat]) => [lat, lon] as [number, number]) : null),
    [selected],
  );

  return (
    <>
      <StatRow>
        <StatCard label="Active spills" value={summary.active} />
        <StatCard label="All alerts" value={summary.total} />
        <StatCard label="High severity" value={summary.high_severity} />
        <StatCard label="Candidate vessels" value={summary.candidate_vessels} note="for active spills" />
      </StatRow>

      <section>
        <h2 className="mb-3 text-xl">Spill alerts</h2>
        <DataTable<Spill>
          caption="Oil spill alerts"
          rows={spills}
          rowKey={(s) => s.id}
          selectedKey={selected?.id}
          onRowClick={(s) => onSelect(s.id)}
          columns={[
            { header: 'Detected', cell: (s) => formatDateTime(s.detected_at) },
            { header: 'Location', cell: (s) => s.location_name },
            { header: 'Area', cell: (s) => `${s.area_km2} km²`, numeric: true },
            { header: 'Confidence', cell: (s) => percent(s.confidence), numeric: true },
            { header: 'Severity', cell: (s) => <SeverityBadge level={s.severity} /> },
            { header: 'Status', cell: (s) => <Tag tone={s.status === 'active' ? 'bad' : 'neutral'}>{s.status === 'active' ? 'Active' : 'Resolved'}</Tag> },
          ]}
        />
      </section>

      {selected && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section>
            <h2 className="mb-3 text-xl">{selected.location_name}</h2>
            <MapView label={`Map of the oil slick ${selected.location_name}`} height="md">
              {spills.map((s) => (
                <Polygon
                  key={s.id}
                  positions={s.polygon.map(([lon, lat]) => [lat, lon] as [number, number])}
                  eventHandlers={{ click: () => onSelect(s.id) }}
                  pathOptions={{
                    color: s.id === selected.id ? colors.navy : severityColor[s.severity],
                    weight: s.id === selected.id ? 3 : 1.5,
                    fillColor: severityColor[s.severity],
                    fillOpacity: 0.45,
                  }}
                >
                  <Tooltip>
                    {s.location_name} · {s.area_km2} km²
                  </Tooltip>
                </Polygon>
              ))}
              <FitBounds bounds={bounds} />
            </MapView>
            <MapLegend
              items={[
                { label: 'Selected slick (outline)', swatch: 'border-navy bg-paper' },
                { label: 'High', swatch: 'border-coral-text bg-coral-text' },
                { label: 'Medium', swatch: 'border-amber bg-amber' },
                { label: 'Low', swatch: 'border-reef-green bg-reef-green' },
              ]}
            />
          </section>

          <section>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="text-xl">Candidate vessels</h2>
              <span className="inline-flex items-center gap-1 rounded border border-amber bg-paper px-2 py-0.5 text-xs font-bold text-ink">
                <CircleHelp aria-hidden className="h-3 w-3 text-amber" /> Candidate, not proof
              </span>
            </div>
            {selected.candidates.length === 0 ? (
              <p className="rounded border border-line bg-paper p-4 text-muted">No vessel matched this slick.</p>
            ) : (
              <DataTable<Candidate>
                caption="Candidate vessels (candidate, not proof)"
                rows={selected.candidates}
                rowKey={(c) => c.vessel_id}
                columns={[
                  { header: 'Rank', cell: (c) => `#${c.rank}` },
                  { header: 'Vessel', cell: (c) => `${c.vessel_name} (${c.vessel_id})` },
                  { header: 'Score', cell: (c) => c.score.toFixed(2), numeric: true },
                  {
                    header: 'Evidence',
                    cell: (c) => (
                      <ul className="list-disc pl-4 font-serif">
                        {c.evidence.map((e) => (
                          <li key={e}>{e}</li>
                        ))}
                      </ul>
                    ),
                  },
                  { header: 'Label', cell: () => <Tag tone="warn">Candidate, not proof</Tag> },
                ]}
              />
            )}
          </section>
        </div>
      )}
    </>
  );
}
