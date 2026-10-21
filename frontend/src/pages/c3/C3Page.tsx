import { useMemo, useState } from 'react';
import { CartesianGrid, Legend as ChartLegend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getC3Data } from '../../api/c3';
import { useApi } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { Legend, ModelPage } from '../../components/ModelPage';
import { SeaMap, niceGraticule, niceScaleKm } from '../../components/SeaMap';
import { SectionTitle, StatRow, Tag } from '../../components/ui';
import { boundsAround, type LonLat } from '../../data/geo';
import { formatMonth } from '../../format';
import { colors, fonts } from '../../theme';
import type { C3Data, Reef, ReefStatus } from '../../types/c3';
import { ReefHealthPanel } from './ReefHealthPanel';

const STATUS: Record<ReefStatus, { label: string; tone: 'good' | 'warn' | 'bad'; fill: string; swatch: string }> = {
  good: { label: 'Good', tone: 'good', fill: colors.tide, swatch: 'bg-tide' },
  watch: { label: 'Watch', tone: 'warn', fill: colors.amber, swatch: 'bg-amber' },
  at_risk: { label: 'At risk', tone: 'bad', fill: colors.coral, swatch: 'bg-coral' },
};

// Line colours + dash patterns so classes differ by more than colour. Extra classes reuse them.
const SERIES = [
  { color: colors.tide, dash: undefined },
  { color: colors.amber, dash: '6 4' },
  { color: colors.muted, dash: '2 3' },
  { color: colors.coral, dash: '8 3 2 3' },
  { color: colors.deep, dash: '1 3' },
];

const axis = { stroke: colors.line, tick: { fill: colors.muted, fontSize: 11, fontFamily: fonts.mono.join(',') } };

function CoverChart({ reef, classes }: { reef: Reef; classes: string[] }) {
  const rows = reef.monthly.map((m) => ({ month: m.month, ...m.cover }));
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={colors.line} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="month" tickFormatter={(m: string) => formatMonth(m)} minTickGap={24} {...axis} />
          <YAxis unit="%" domain={[0, 100]} width={52} {...axis} />
          <Tooltip
            labelFormatter={(m) => formatMonth(String(m))}
            formatter={(v) => `${Number(v).toFixed(1)}%`}
            contentStyle={{ background: colors.white, border: `1px solid ${colors.line}`, borderRadius: 3, fontFamily: fonts.body.join(','), fontSize: 13 }}
          />
          <ChartLegend wrapperStyle={{ fontFamily: fonts.body.join(','), fontSize: 13, color: colors.muted }} />
          {classes.map((c, i) => {
            const s = SERIES[i % SERIES.length];
            return <Line key={c} dataKey={c} name={c} stroke={s.color} strokeDasharray={s.dash} strokeWidth={2} dot={false} isAnimationActive={false} />;
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function C3Page() {
  const state = useApi(getC3Data, []);
  return (
    <ModelPage id="c3" state={state} isEmpty={(d) => d.reefs.length === 0} emptyMessage="No reef results yet. The C3 model has not exported any data.">
      {(data) => <C3Content data={data} />}
    </ModelPage>
  );
}

function C3Content({ data }: { data: C3Data }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = data.reefs.find((r) => r.id === selectedId) ?? data.reefs.find((r) => r.status === 'at_risk') ?? data.reefs[0];
  const bounds = useMemo(() => boundsAround(data.reefs.map((r) => [r.lon, r.lat] as LonLat), 0.6, 2.5), [data]);

  return (
    <>
      <ReefHealthPanel />

      <StatRow
        items={[
          { label: 'Reefs monitored', value: data.summary.reefs_total },
          { label: 'At risk', value: data.summary.at_risk },
          { label: 'Watch', value: data.summary.watch },
          { label: 'Mean coral cover', value: data.summary.mean_coral === null ? '—' : `${data.summary.mean_coral}%` },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-12">
        <figure className="lg:col-span-6">
          <div className="overflow-hidden rounded-[4px] border border-line">
            <SeaMap
              bounds={bounds}
              graticule={niceGraticule(bounds)}
              scaleKm={niceScaleKm(bounds)}
              label="Map of monitored reefs"
              over={(P) => (
                <g>
                  {data.reefs.map((r) => {
                    const [x, y] = P.project([r.lon, r.lat]);
                    const on = r.id === selected?.id;
                    return (
                      <g key={r.id} onClick={() => setSelectedId(r.id)} className="cursor-pointer">
                        <title>{`${r.name} · ${STATUS[r.status].label}`}</title>
                        {on && <circle cx={x} cy={y} r="16" fill="none" stroke="#12222d" strokeWidth="2" />}
                        <path d={`M${x} ${y - 9} L${x + 9} ${y} L${x} ${y + 9} L${x - 9} ${y} Z`} fill={STATUS[r.status].fill} stroke="#fff" strokeWidth="1.5" />
                      </g>
                    );
                  })}
                </g>
              )}
            />
          </div>
          <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-muted">
            {Object.values(STATUS).map((s) => (
              <Legend key={s.label} swatch={s.swatch} label={s.label} />
            ))}
          </figcaption>
        </figure>

        <section className="lg:col-span-6">
          <SectionTitle>Reefs</SectionTitle>
          <DataTable<Reef>
            caption="Monitored reefs"
            rows={data.reefs}
            rowKey={(r) => r.id}
            selectedKey={selected?.id}
            onRowClick={(r) => setSelectedId(r.id)}
            minWidth="min-w-[480px]"
            columns={[
              { header: 'Reef', cell: (r) => r.name },
              { header: 'Status', cell: (r) => <Tag tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Tag> },
              { header: 'Coral', cell: (r) => (r.latest_cover.Coral === undefined ? '—' : `${r.latest_cover.Coral.toFixed(1)}%`), numeric: true },
              { header: '12-month change', cell: (r) => `${r.change_12m > 0 ? '+' : ''}${r.change_12m.toFixed(1)} pts`, numeric: true },
            ]}
          />
        </section>
      </div>

      {selected && (
        <section className="rounded-[4px] border border-line bg-white p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-[22px] leading-tight text-deep">{selected.name}</h2>
            <Tag tone={STATUS[selected.status].tone}>{STATUS[selected.status].label}</Tag>
          </div>
          <p className="mb-4 mt-1 font-mono text-[11.5px] text-muted">
            {selected.region} · monthly benthic cover · latest {formatMonth(selected.latest_month)}
          </p>
          <CoverChart reef={selected} classes={data.classes} />
        </section>
      )}
    </>
  );
}
