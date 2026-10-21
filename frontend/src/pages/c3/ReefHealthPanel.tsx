import { useState } from 'react';
import { MapPin, Thermometer } from 'lucide-react';
import { CircleMarker, Tooltip as MapTooltip } from 'react-leaflet';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getC3SiteHealth, getC3Sites } from '../../api/c3';
import { useApi } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { ErrorMessage } from '../../components/ErrorMessage';
import { Loading } from '../../components/Loading';
import { MapView } from '../../components/MapView';
import { SeverityBadge, Tag } from '../../components/SeverityBadge';
import { StatCard } from '../../components/StatCard';
import { formatDate, formatMonth } from '../../format';
import { colors, fonts } from '../../theme';
import type { ClassCover, SiteHealth } from '../../types/c3';

/** Same colours as the C3 habitat maps. */
const SWATCH: Record<string, string> = {
  Sand: 'border-amber bg-amber',
  Rubble: 'border-muted bg-line',
  Rock: 'border-muted bg-muted',
  Seagrass: 'border-reef-green bg-reef-green',
  'Coral/Algae': 'border-coral bg-coral',
  'Microalgal Mats': 'border-sea bg-sea',
};

/** "Try the model": choose a reef location and see its health from the C3 model. */
export function ReefHealthPanel() {
  const status = useApi(getC3Sites, []);
  const [code, setCode] = useState<string | null>(null);
  const sites = status.data?.sites ?? [];
  const chosen = code ?? sites.find((s) => s.saved || s.live)?.code ?? null;
  const health = useApi(() => (chosen ? getC3SiteHealth(chosen) : Promise.resolve(null)), [chosen]);
  const m = status.data?.model;

  return (
    <section className="rounded border border-line bg-paper p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <MapPin aria-hidden className="h-6 w-6 text-coral" />
        <h2 className="text-xl">Reef health by location</h2>
      </div>
      <p className="mt-1 max-w-3xl font-serif text-muted">
        Choose a reef. The C3 model maps the reef floor from Sentinel-2 images (sand, rubble, rock, coral/algae) and shows how
        much is coral/algae, with heat stress from NOAA Coral Reef Watch when available.
      </p>
      {m && (
        <p className="mt-2 text-sm text-muted">
          Model: {m.name} ({m.experiment}) · spatial cross-validation macro-F1 {m.cv_macro_f1?.toFixed(2) ?? '—'}, accuracy{' '}
          {m.cv_accuracy !== null ? `${Math.round(m.cv_accuracy * 100)}%` : '—'}
        </p>
      )}

      {status.loading && <Loading text="Loading reef sites…" />}
      {status.error && <ErrorMessage message={status.error} onRetry={status.reload} />}

      {status.data && (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-3">
            <MapView label="Map of C3 reef sites" height="sm" zoom={6}>
              {sites
                .filter((s) => s.lat !== null && s.lon !== null)
                .map((s) => (
                  <CircleMarker
                    key={s.code}
                    center={[s.lat as number, s.lon as number]}
                    radius={s.code === chosen ? 12 : 9}
                    eventHandlers={{ click: () => setCode(s.code) }}
                    pathOptions={{
                      color: s.code === chosen ? colors.navy : colors.coral,
                      fillColor: colors.coral,
                      fillOpacity: 0.75,
                      weight: s.code === chosen ? 3 : 2,
                    }}
                  >
                    <MapTooltip>{s.name}</MapTooltip>
                  </CircleMarker>
                ))}
            </MapView>
            <ul className="flex flex-col gap-2">
              {sites.map((s) => (
                <li key={s.code}>
                  <button
                    type="button"
                    aria-pressed={s.code === chosen}
                    disabled={!s.saved && !s.live}
                    onClick={() => setCode(s.code)}
                    className={`flex min-h-12 w-full items-center justify-between gap-2 rounded border px-4 py-2 text-left disabled:opacity-50 ${
                      s.code === chosen ? 'border-navy bg-navy text-paper' : 'border-line bg-paper text-navy hover:bg-paper-2'
                    }`}
                  >
                    <span>
                      <span className="block font-bold">{s.name}</span>
                      <span className={`text-sm ${s.code === chosen ? 'text-line' : 'text-muted'}`}>{s.region}</span>
                    </span>
                    <MapPin aria-hidden className="h-5 w-5 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            {health.loading && <Loading text="Getting reef health… (a live model run can take up to 30 s)" />}
            {health.error && <ErrorMessage message={health.error} onRetry={health.reload} />}
            {health.data && !health.loading && <Health h={health.data} />}
          </div>
        </div>
      )}
    </section>
  );
}

function Health({ h }: { h: SiteHealth }) {
  const top = [...h.cover].sort((a, b) => b.percent - a.percent)[0];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg">{h.name}</h3>
        <Tag tone={h.source === 'live' ? 'good' : 'info'}>{h.source === 'live' ? 'Live model run' : 'Saved model results'}</Tag>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Coral/Algae cover" value={h.coral_algae_percent !== null ? `${h.coral_algae_percent}%` : '—'} note="of the mapped reef" />
        <StatCard label="Main class" value={top?.name ?? '—'} note={top ? `${top.percent}%` : undefined} />
        <StatCard label="Mapped reef area" value={`${h.mapped_area_ha} ha`} note="10 m pixels" />
        <StatCard
          label="Heat stress"
          value={h.thermal ? <SeverityBadge level={h.thermal.severity} /> : '—'}
          note={h.thermal ? `${h.thermal.alert} · max ${h.thermal.max_12m} °C-weeks` : 'no DHW data yet'}
        />
      </div>

      {h.images.figure && (
        <figure>
          <img src={h.images.figure} alt={`${h.name}: satellite image, C3 habitat map and Allen Coral Atlas reference`} className="block h-auto w-full rounded border border-line bg-paper" />
          <figcaption className="mt-1 text-sm text-muted">
            Left: Sentinel-2 image · middle: C3 model habitat map · right: Allen Coral Atlas reference
            {h.agreement !== null ? ` (${Math.round(h.agreement * 100)}% agreement)` : ''}
          </figcaption>
        </figure>
      )}
      {!h.images.figure && h.images.rgb && h.images.classes && (
        <div className="grid gap-3 md:grid-cols-2">
          <figure>
            <img src={h.images.rgb} alt={`${h.name} true-colour satellite image`} className="block h-auto w-full rounded border border-line" />
            <figcaption className="mt-1 text-sm text-muted">Sentinel-2 true colour</figcaption>
          </figure>
          <figure>
            <img src={h.images.classes} alt={`${h.name} habitat map`} className="block h-auto w-full rounded border border-line" />
            <figcaption className="mt-1 text-sm text-muted">C3 habitat map (live run, {(h.runtime_ms / 1000).toFixed(1)} s)</figcaption>
          </figure>
        </div>
      )}

      <DataTable<ClassCover>
        caption={`Benthic cover at ${h.name}`}
        rows={h.cover}
        rowKey={(c) => c.name}
        columns={[
          {
            header: 'Class',
            cell: (c) => (
              <span className="flex items-center gap-2">
                <span aria-hidden className={`inline-block h-3 w-3 rounded-full border ${SWATCH[c.name] ?? 'border-line bg-line'}`} />
                {c.name}
              </span>
            ),
          },
          { header: 'Cover', cell: (c) => `${c.percent}%`, numeric: true },
          { header: 'Area', cell: (c) => `${c.area_ha} ha`, numeric: true },
        ]}
      />

      {h.thermal ? <ThermalChart h={h} /> : (
        <p className="flex items-center gap-2 rounded border border-line bg-paper-2 px-3 py-2 text-sm">
          <Thermometer aria-hidden className="h-4 w-4 text-navy" />
          Heat stress appears here when dhw_{h.code}.csv (NOAA Coral Reef Watch) is added to data/external/c3/.
        </p>
      )}

      <p className="text-sm text-muted">
        {h.source_note}. Satellite-derived indicators, not confirmed ecological health assessments – confirm with a dive survey.
      </p>
    </div>
  );
}

function ThermalChart({ h }: { h: SiteHealth }) {
  const t = h.thermal!;
  const axis = { stroke: colors.line, tick: { fill: colors.muted, fontSize: 12, fontFamily: fonts.sans.join(',') } };
  return (
    <div>
      <h4 className="mb-1 font-bold text-navy">Heat stress (Degree Heating Weeks)</h4>
      <p className="mb-2 text-sm">
        <strong>{t.alert}:</strong> {t.alert_text}. Highest in the last 12 months: {t.max_12m} °C-weeks on {formatDate(t.max_12m_date)}.
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={t.monthly} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={colors.line} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="month" tickFormatter={(m: string) => formatMonth(m)} minTickGap={24} {...axis} />
          <YAxis width={44} {...axis} />
          <Tooltip labelFormatter={(m) => formatMonth(String(m))} formatter={(v) => `${Number(v).toFixed(1)} °C-weeks`} />
          <ReferenceLine y={4} stroke={colors.amber} strokeDasharray="6 4" />
          <ReferenceLine y={8} stroke={colors['coral-text']} strokeDasharray="6 4" />
          <Bar dataKey="dhw" name="Monthly max DHW" fill={colors.navy} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-sm text-muted">Dashed lines: 4 °C-weeks (bleaching likely) and 8 °C-weeks (severe). Source: NOAA Coral Reef Watch.</p>
    </div>
  );
}
