import { useMemo, useState } from 'react';
import { getC4Data } from '../../api/c4';
import { useApi } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { Legend, ModelPage } from '../../components/ModelPage';
import { SeaMap, niceGraticule, niceScaleKm } from '../../components/SeaMap';
import { CandidateBadge, SectionTitle, SeverityBadge, StatRow, Tag } from '../../components/ui';
import { boundsAround, type LonLat } from '../../data/geo';
import { formatDateTime, percent } from '../../format';
import { severityColor } from '../../theme';
import type { C4Data, Candidate, Spill } from '../../types/c4';
import { DetectPanel } from './DetectPanel';

export default function C4Page() {
  const state = useApi(getC4Data, []);
  return (
    <ModelPage id="c4" state={state} isEmpty={(d) => d.spills.length === 0} emptyMessage="No spill alerts yet. The C4 model has not exported any detections.">
      {(data) => (
        <>
          <DetectPanel />
          <SpillView data={data} />
        </>
      )}
    </ModelPage>
  );
}

function SpillView({ data }: { data: C4Data }) {
  const { spills, summary } = data;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = spills.find((s) => s.id === selectedId) ?? spills[0];
  const bounds = useMemo(() => boundsAround(selected.polygon as LonLat[], 0.08, 0.3), [selected]);

  return (
    <>
      <StatRow
        items={[
          { label: 'Active spills', value: summary.active },
          { label: 'All alerts', value: summary.total },
          { label: 'High severity', value: summary.high_severity },
          { label: 'Candidate vessels', value: summary.candidate_vessels, note: 'for active spills' },
        ]}
      />

      <section>
        <SectionTitle>Spill alerts</SectionTitle>
        <DataTable<Spill>
          caption="Oil spill alerts"
          rows={spills}
          rowKey={(s) => s.id}
          selectedKey={selected.id}
          onRowClick={(s) => setSelectedId(s.id)}
          minWidth="min-w-[760px]"
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

      <div className="grid gap-8 lg:grid-cols-12">
        <figure className="lg:col-span-6">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-[22px] leading-tight text-deep">{selected.location_name}</h2>
            <span className="font-mono text-[11.5px] text-muted">
              {selected.sensor} · {formatDateTime(selected.detected_at)}
            </span>
          </div>
          <div className="overflow-hidden rounded-[4px] border border-line">
            <SeaMap
              bounds={bounds}
              graticule={niceGraticule(bounds)}
              scaleKm={niceScaleKm(bounds)}
              label={`Map of the oil slick near ${selected.location_name}`}
              over={(P) => (
                <g>
                  {spills.map((s) => {
                    const on = s.id === selected.id;
                    return (
                      <path
                        key={s.id}
                        d={P.path(s.polygon as LonLat[])}
                        onClick={() => setSelectedId(s.id)}
                        className="cursor-pointer"
                        fill={severityColor[s.severity]}
                        fillOpacity={on ? 0.5 : 0.3}
                        stroke={on ? '#0b2d40' : severityColor[s.severity]}
                        strokeWidth={on ? 2.5 : 1.2}
                        strokeLinejoin="round"
                      >
                        <title>{`${s.location_name} · ${s.area_km2} km²`}</title>
                      </path>
                    );
                  })}
                </g>
              )}
            />
          </div>
          <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-muted">
            <Legend swatch="border-2 border-deep bg-white" label="Selected slick" />
            <Legend swatch="bg-coral" label="High" />
            <Legend swatch="bg-amber" label="Medium" />
            <Legend swatch="bg-tide" label="Low" />
          </figcaption>
        </figure>

        <section className="lg:col-span-6">
          <SectionTitle aside={<CandidateBadge />}>Candidate vessels</SectionTitle>
          {selected.candidates.length === 0 ? (
            <p className="border-t border-line pt-4 text-[14px] text-muted">No vessel matched this slick.</p>
          ) : (
            <ol className="border-t border-line">
              {selected.candidates.map((c: Candidate) => (
                <li key={c.vessel_id} className="grid grid-cols-[40px_1fr_auto] gap-x-3 border-b border-line py-4">
                  <span className="font-mono text-[12px] leading-[1.9] text-coral">#{c.rank}</span>
                  <div>
                    <p className="font-display text-[18px] leading-tight text-deep">{c.vessel_name}</p>
                    <p className="mt-0.5 font-mono text-[11.5px] text-muted">{c.vessel_id}</p>
                    <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[13.5px] leading-[1.55] text-ink/80">
                      {c.evidence.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[11px] text-muted">score</p>
                    <p className="font-display text-[22px] leading-none text-deep">{c.score.toFixed(2)}</p>
                    <div className="mt-2">
                      <CandidateBadge small />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
