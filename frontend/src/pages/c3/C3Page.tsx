import { useState } from 'react';
import { CircleMarker, Tooltip as MapTooltip } from 'react-leaflet';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getC3Data } from '../../api/c3';
import { useApi } from '../../api/client';
import { ComponentPage, StatRow } from '../../components/ComponentPage';
import { DataTable } from '../../components/DataTable';
import { MapLegend } from '../../components/MapLegend';
import { MapView } from '../../components/MapView';
import { Tag } from '../../components/SeverityBadge';
import { StatCard } from '../../components/StatCard';
import { formatMonth } from '../../format';
import { colors, fonts } from '../../theme';
import type { Reef, ReefStatus } from '../../types/c3';
import { ReefHealthPanel } from './ReefHealthPanel';

const STATUS: Record<ReefStatus, { label: string; tone: 'good' | 'warn' | 'bad'; color: string }> = {
  good: { label: 'Good', tone: 'good', color: colors['reef-green'] },
  watch: { label: 'Watch', tone: 'warn', color: colors.amber },
  at_risk: { label: 'At risk', tone: 'bad', color: colors['coral-text'] },
};

// Line colours + dash patterns so classes differ by more than colour. Extra classes reuse them.
const SERIES = [
  { color: colors['reef-green'], dash: undefined },
  { color: colors.amber, dash: '6 4' },
  { color: colors.muted, dash: '2 3' },
  { color: colors.sea, dash: '8 3 2 3' },
  { color: colors.navy, dash: '1 3' },
];

function CoverChart({ reef, classes }: { reef: Reef; classes: string[] }) {
  const rows = reef.monthly.map((m) => ({ month: m.month, ...m.cover }));
  const axis = { stroke: colors.line, tick: { fill: colors.muted, fontSize: 12, fontFamily: fonts.sans.join(',') } };
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={colors.line} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="month" tickFormatter={(m: string) => formatMonth(m)} minTickGap={24} {...axis} />
        <YAxis unit="%" domain={[0, 100]} width={52} {...axis} />
        <Tooltip
          labelFormatter={(m) => formatMonth(String(m))}
          formatter={(v) => `${Number(v).toFixed(1)}%`}
          contentStyle={{ background: colors.paper, border: `1px solid ${colors.line}`, borderRadius: 4, fontFamily: fonts.sans.join(',') }}
        />
        <Legend wrapperStyle={{ fontFamily: fonts.sans.join(','), fontSize: 14 }} />
        {classes.map((c, i) => {
          const s = SERIES[i % SERIES.length];
          return <Line key={c} dataKey={c} name={c} stroke={s.color} strokeDasharray={s.dash} strokeWidth={2.5} dot={false} isAnimationActive={false} />;
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function C3Page() {
  const state = useApi(getC3Data, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <ComponentPage
      code="C3"
      title="Reef Health Monitoring"
      description="Monthly benthic cover per reef, estimated from Sentinel-2 satellite images. Select a reef to see its monthly chart."
      state={state}
      isEmpty={(d) => d.reefs.length === 0}
      emptyMessage="No reef results yet. The C3 model has not exported any data."
      disclaimer="Model output – not field-confirmed. Satellite estimates need confirming by a dive survey."
    >
      {(data) => {
        const selected = data.reefs.find((r) => r.id === selectedId) ?? data.reefs.find((r) => r.status === 'at_risk') ?? data.reefs[0];
        return (
          <>
            <ReefHealthPanel />

            <StatRow>
              <StatCard label="Reefs monitored" value={data.summary.reefs_total} />
              <StatCard label="At risk" value={data.summary.at_risk} />
              <StatCard label="Watch" value={data.summary.watch} />
              <StatCard label="Mean coral cover" value={data.summary.mean_coral === null ? '—' : `${data.summary.mean_coral}%`} />
            </StatRow>

            <div className="grid gap-6 lg:grid-cols-2">
              <section>
                <MapView label="Map of monitored reefs" height="md">
                  {data.reefs.map((r) => (
                    <CircleMarker
                      key={r.id}
                      center={[r.lat, r.lon]}
                      radius={r.id === selected?.id ? 11 : 8}
                      eventHandlers={{ click: () => setSelectedId(r.id) }}
                      pathOptions={{ color: r.id === selected?.id ? colors.navy : STATUS[r.status].color, fillColor: STATUS[r.status].color, fillOpacity: 0.75, weight: r.id === selected?.id ? 3 : 2 }}
                    >
                      <MapTooltip>
                        {r.name} · {STATUS[r.status].label}
                      </MapTooltip>
                    </CircleMarker>
                  ))}
                </MapView>
                <MapLegend
                  items={[
                    { label: 'Good', swatch: 'border-reef-green bg-reef-green' },
                    { label: 'Watch', swatch: 'border-amber bg-amber' },
                    { label: 'At risk', swatch: 'border-coral-text bg-coral-text' },
                  ]}
                />
              </section>

              <section>
                <h2 className="mb-3 text-xl">Reefs</h2>
                <DataTable<Reef>
                  caption="Monitored reefs"
                  rows={data.reefs}
                  rowKey={(r) => r.id}
                  selectedKey={selected?.id}
                  onRowClick={(r) => setSelectedId(r.id)}
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
              <section className="rounded border border-line bg-paper p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl">{selected.name}</h2>
                  <Tag tone={STATUS[selected.status].tone}>{STATUS[selected.status].label}</Tag>
                </div>
                <p className="mb-4 text-sm text-muted">
                  {selected.region} · monthly benthic cover · latest {formatMonth(selected.latest_month)}
                </p>
                <CoverChart reef={selected} classes={data.classes} />
              </section>
            )}
          </>
        );
      }}
    </ComponentPage>
  );
}
