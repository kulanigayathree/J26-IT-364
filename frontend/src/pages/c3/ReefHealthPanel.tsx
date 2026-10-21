import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Thermometer } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getC3SiteHealth, getC3Sites } from '../../api/c3';
import { useApi } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { SeaMap } from '../../components/SeaMap';
import { ErrorMessage, Loading, Notice, Panel, SeverityBadge, Tag } from '../../components/ui';
import { formatDate, formatMonth } from '../../format';
import { colors, fonts } from '../../theme';
import type { ClassCover, SiteHealth } from '../../types/c3';

/** Same colours as the C3 habitat maps. */
const SWATCH: Record<string, string> = {
  Sand: 'bg-[#e3cf94]',
  Rubble: 'bg-line',
  Rock: 'bg-muted',
  Seagrass: 'bg-tide',
  'Coral/Algae': 'bg-coral',
  'Microalgal Mats': 'bg-shallow',
};

const SRI_LANKA_BOUNDS = { west: 79.0, east: 82.4, south: 5.7, north: 10.0 };

/** "Try the model": choose a reef location and see its health from the C3 model. */
export function ReefHealthPanel() {
  const status = useApi(getC3Sites, []);
  const [code, setCode] = useState<string | null>(null);
  const sites = status.data?.sites ?? [];
  const chosen = code ?? sites.find((s) => s.saved || s.live)?.code ?? null;
  const health = useApi(() => (chosen ? getC3SiteHealth(chosen) : Promise.resolve(null)), [chosen]);
  const m = status.data?.model;

  return (
    <Panel title="Reef health by location" icon={<MapPin className="size-5 text-coral" strokeWidth={1.75} />}>
      <p className="max-w-[720px] text-[14.5px] leading-[1.65] text-muted">
        Choose a reef. The C3 model maps the reef floor from Sentinel-2 images (sand, rubble, rock, coral/algae) and shows how much is
        coral/algae, with heat stress from NOAA Coral Reef Watch when available.
      </p>
      {m && (
        <p className="mt-2 font-mono text-[11.5px] text-muted">
          Model: {m.name} ({m.experiment}) · spatial cross-validation macro-F1 {m.cv_macro_f1?.toFixed(2) ?? '—'}, accuracy{' '}
          {m.cv_accuracy !== null ? `${Math.round(m.cv_accuracy * 100)}%` : '—'}
        </p>
      )}

      {status.loading && <Loading text="Loading reef sites…" />}
      {status.error && <div className="mt-4"><ErrorMessage message={status.error} onRetry={status.reload} /></div>}
      {status.data && !status.data.available && status.data.message && <div className="mt-4"><Notice>{status.data.message}</Notice></div>}

      {status.data && (
        <div className="mt-6 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="overflow-hidden rounded-[3px] border border-line">
              <SeaMap
                bounds={SRI_LANKA_BOUNDS}
                label="Map of C3 reef sites"
                showPorts={false}
                scaleKm={50}
                over={(P) => (
                  <g>
                    {sites
                      .filter((s) => s.lat !== null && s.lon !== null)
                      .map((s) => {
                        const [x, y] = P.project([s.lon as number, s.lat as number]);
                        const on = s.code === chosen;
                        const usable = s.saved || s.live;
                        return (
                          <g key={s.code} onClick={() => usable && setCode(s.code)} className={usable ? 'cursor-pointer' : undefined}>
                            <title>{s.name}</title>
                            {on && <circle cx={x} cy={y} r="17" fill="none" stroke="#12222d" strokeWidth="2" />}
                            <path
                              d={`M${x} ${y - 10} L${x + 10} ${y} L${x} ${y + 10} L${x - 10} ${y} Z`}
                              fill={usable ? '#d0603f' : '#56656f'}
                              fillOpacity={usable ? 0.9 : 0.5}
                              stroke="#fff"
                              strokeWidth="1.5"
                            />
                            <text x={x + 15} y={y + 5} fontFamily="IBM Plex Sans, sans-serif" fontSize="15" fill="#12222d">
                              {s.name}
                            </text>
                          </g>
                        );
                      })}
                  </g>
                )}
              />
            </div>
            <ul className="mt-4 border-t border-line">
              {sites.map((s) => (
                <li key={s.code} className="border-b border-line">
                  <button
                    type="button"
                    aria-pressed={s.code === chosen}
                    disabled={!s.saved && !s.live}
                    onClick={() => setCode(s.code)}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors duration-150 disabled:opacity-50 ${
                      s.code === chosen ? 'bg-shallow/20' : 'hover:bg-sand/50'
                    }`}
                  >
                    <span>
                      <span className="block font-display text-[17px] leading-tight text-deep">{s.name}</span>
                      <span className="text-[12.5px] text-muted">{s.region}</span>
                    </span>
                    <span className="font-mono text-[11px] text-muted">{s.code}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-8">
            {health.loading && <Loading text="Getting reef health… (a live model run can take up to 30 s)" />}
            {health.error && <ErrorMessage message={health.error} onRetry={health.reload} />}
            {health.data && !health.loading && <Health h={health.data} />}
          </div>
        </div>
      )}
    </Panel>
  );
}

function Health({ h }: { h: SiteHealth }) {
  const top = [...h.cover].sort((a, b) => b.percent - a.percent)[0];
  const stats = [
    { k: 'Coral/algae cover', v: h.coral_algae_percent !== null ? `${h.coral_algae_percent}%` : '—', n: 'of the mapped reef' },
    { k: 'Main class', v: top?.name ?? '—', n: top ? `${top.percent}%` : '' },
    { k: 'Mapped reef area', v: `${h.mapped_area_ha} ha`, n: '10 m pixels' },
    {
      k: 'Heat stress',
      v: h.thermal ? <SeverityBadge level={h.thermal.severity} /> : '—',
      n: h.thermal ? `${h.thermal.alert} · max ${h.thermal.max_12m} °C-weeks` : 'no DHW data yet',
    },
  ];

  return (
    <motion.div key={h.code} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}>
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-display text-[24px] leading-tight text-deep">{h.name}</h3>
        <Tag tone={h.source === 'live' ? 'good' : 'info'}>{h.source === 'live' ? 'Live model run' : 'Saved model results'}</Tag>
      </div>
      <p className="mt-1 text-[13px] text-muted">{h.region}</p>

      <dl className="mt-4 grid grid-cols-2 border-y border-line md:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.k} className={`px-3 py-3 ${i % 2 ? 'border-l border-line' : ''} ${i >= 2 ? 'border-t border-line md:border-t-0' : ''} ${i === 2 ? 'md:border-l' : ''}`}>
            <dt className="font-mono text-[10.5px] text-muted">{s.k}</dt>
            <dd className="mt-1 font-display text-[22px] leading-none text-deep">{s.v}</dd>
            {s.n && <p className="mt-1 text-[12px] text-muted">{s.n}</p>}
          </div>
        ))}
      </dl>

      {h.images.figure && (
        <figure className="mt-5">
          <img
            src={h.images.figure}
            alt={`${h.name}: satellite image, C3 habitat map and Allen Coral Atlas reference`}
            className="block h-auto w-full rounded-[3px] border border-line bg-white"
          />
          <figcaption className="mt-2 font-mono text-[11px] text-muted">
            Left: Sentinel-2 image · middle: C3 model habitat map · right: Allen Coral Atlas reference
            {h.agreement !== null ? ` (${Math.round(h.agreement * 100)}% agreement)` : ''}
          </figcaption>
        </figure>
      )}
      {!h.images.figure && h.images.rgb && h.images.classes && (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <figure>
            <img src={h.images.rgb} alt={`${h.name} true-colour satellite image`} className="block h-auto w-full rounded-[3px] border border-line" />
            <figcaption className="mt-2 font-mono text-[11px] text-muted">Sentinel-2 true colour</figcaption>
          </figure>
          <figure>
            <img src={h.images.classes} alt={`${h.name} habitat map`} className="block h-auto w-full rounded-[3px] border border-line" />
            <figcaption className="mt-2 font-mono text-[11px] text-muted">C3 habitat map (live run, {(h.runtime_ms / 1000).toFixed(1)} s)</figcaption>
          </figure>
        </div>
      )}

      <div className="mt-5">
        <DataTable<ClassCover>
          caption={`Benthic cover at ${h.name}`}
          rows={h.cover}
          rowKey={(c) => c.name}
          minWidth="min-w-[420px]"
          columns={[
            {
              header: 'Class',
              cell: (c) => (
                <span className="flex items-center gap-2">
                  <span aria-hidden className={`inline-block size-2.5 rounded-full ${SWATCH[c.name] ?? 'bg-line'}`} />
                  {c.name}
                </span>
              ),
            },
            { header: 'Cover', cell: (c) => `${c.percent}%`, numeric: true },
            { header: 'Area', cell: (c) => `${c.area_ha} ha`, numeric: true },
          ]}
        />
      </div>

      <div className="mt-5">
        {h.thermal ? (
          <ThermalChart h={h} />
        ) : (
          <Notice>
            <span className="inline-flex items-start gap-2">
              <Thermometer className="mt-0.5 size-4 shrink-0 text-amber-text" strokeWidth={1.75} />
              <span>
                Heat stress appears here when <code className="font-mono text-[12px]">dhw_{h.code}.csv</code> (NOAA Coral Reef Watch) is added to{' '}
                <code className="font-mono text-[12px]">data/external/c3/</code>.
              </span>
            </span>
          </Notice>
        )}
      </div>

      <p className="mt-3 text-[12.5px] leading-[1.6] text-muted">
        {h.source_note}. Satellite-derived indicators, not confirmed ecological health assessments — confirm with a dive survey.
      </p>
    </motion.div>
  );
}

const axis = { stroke: colors.line, tick: { fill: colors.muted, fontSize: 11, fontFamily: fonts.mono.join(',') } };

function ThermalChart({ h }: { h: SiteHealth }) {
  const t = h.thermal!;
  return (
    <figure>
      <figcaption>
        <p className="font-display text-[19px] text-deep">Heat stress (Degree Heating Weeks)</p>
        <p className="mt-1 text-[13.5px] leading-[1.6] text-ink/80">
          <strong className="font-medium">{t.alert}:</strong> {t.alert_text}. Highest in the last 12 months: {t.max_12m} °C-weeks on{' '}
          {formatDate(t.max_12m_date)}.
        </p>
      </figcaption>
      <div className="mt-3 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={t.monthly} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke={colors.line} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="month" tickFormatter={(m: string) => formatMonth(m)} minTickGap={24} {...axis} />
            <YAxis width={44} {...axis} />
            <Tooltip labelFormatter={(m) => formatMonth(String(m))} formatter={(v) => `${Number(v).toFixed(1)} °C-weeks`} />
            <ReferenceLine y={4} stroke={colors.amber} strokeDasharray="4 3" />
            <ReferenceLine y={8} stroke={colors.coral} strokeDasharray="4 3" />
            <Bar dataKey="dhw" name="Monthly max DHW" fill={colors['deep-2']} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[12.5px] text-muted">Dashed lines: 4 °C-weeks (bleaching likely) and 8 °C-weeks (severe). Source: NOAA Coral Reef Watch.</p>
    </figure>
  );
}
