import { useMemo, useState, type ChangeEvent } from 'react';
import { Activity, FileUp } from 'lucide-react';
import { CircleMarker, Polyline, Tooltip } from 'react-leaflet';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import { analyseTrack, getC1AnalyseStatus } from '../../api/c1';
import { useApi } from '../../api/client';
import { Button } from '../../components/Button';
import { DataTable } from '../../components/DataTable';
import { ErrorMessage } from '../../components/ErrorMessage';
import { inputClass } from '../../components/FormField';
import { Loading } from '../../components/Loading';
import { MapLegend } from '../../components/MapLegend';
import { FitBounds, MapView } from '../../components/MapView';
import { Tag } from '../../components/SeverityBadge';
import { StatCard } from '../../components/StatCard';
import { formatDateTime, formatLatLon } from '../../format';
import { colors, fonts } from '../../theme';
import type { AnalyseResult, AnomalyEvent } from '../../types/c1';

const INJECT_OPTIONS = [
  { value: '', label: 'No test anomaly' },
  { value: 'spoof', label: 'Inject: Spoofing (position jump)' },
  { value: 'gap', label: 'Inject: AIS gap (transponder off)' },
  { value: 'slowdown', label: 'Inject: Slowdown (transit → fishing speed)' },
  { value: 'zigzag', label: 'Inject: Zigzag (erratic course)' },
];

const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`);

/** "Try the model": run the trained C1 model on a vessel track. */
export function AnalysePanel() {
  const status = useApi(getC1AnalyseStatus, []);
  const [source, setSource] = useState<'example' | 'file'>('example');
  const [exampleId, setExampleId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [inject, setInject] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyseResult | null>(null);

  const examples = status.data?.examples ?? [];
  const chosenExample = exampleId || examples[0]?.id || '';
  const canRun = source === 'example' ? Boolean(chosenExample) : Boolean(file);

  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(
        await analyseTrack(source === 'example' ? { exampleId: chosenExample, inject } : { file: file ?? undefined, inject }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.');
    } finally {
      setBusy(false);
    }
  };

  const m = status.data?.metrics;

  return (
    <section className="rounded border border-line bg-paper p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Activity aria-hidden className="h-6 w-6 text-coral" />
        <h2 className="text-xl">Try the model: check a vessel track for anomalies</h2>
      </div>
      <p className="mt-1 max-w-3xl font-serif text-muted">
        The C1 model reads a vessel's AIS track in windows of 10 pings, scores how unusual each window is with a
        time-decay GRU autoencoder plus an AIS-gap rule, and names the type of unusual behaviour.
      </p>

      {status.error && <p className="mt-3 text-sm text-coral-text">{status.error}</p>}
      {status.data && !status.data.available && (
        <p className="mt-3 rounded border border-l-4 border-line border-l-amber bg-paper-2 px-3 py-2 text-sm">{status.data.message}</p>
      )}
      {status.data?.available && m && (
        <p className="mt-3 text-sm text-muted">
          Model: {status.data.model} · test results: ROC-AUC {m.roc_auc?.toFixed(2) ?? '—'}, precision {pct(m.precision)}, recall{' '}
          {pct(m.recall)}, false-alarm rate {pct(m.far)}
        </p>
      )}

      {status.data?.available && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="grid max-w-md grid-cols-2 overflow-hidden rounded border border-navy">
            {(['example', 'file'] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={source === s}
                onClick={() => setSource(s)}
                className={`h-11 font-bold ${source === s ? 'bg-navy text-paper' : 'bg-paper text-navy hover:bg-paper-2'}`}
              >
                {s === 'example' ? 'Example vessel' : 'Upload CSV'}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {source === 'example' ? (
              <label className="flex flex-col gap-1 text-sm font-bold">
                Example track (C1 evaluation data)
                <select value={chosenExample} onChange={(e) => setExampleId(e.target.value)} className={`${inputClass} font-normal`}>
                  {examples.map((x) => (
                    <option key={x.id} value={x.id}>
                      Vessel {x.mmsi} · {x.pings} pings · {x.injected.length ? `has test anomaly: ${x.injected.join(', ')}` : 'no test anomaly'}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="flex cursor-pointer items-center gap-3 self-end rounded border border-dashed border-muted bg-paper-2 px-4 py-3 hover:border-navy">
                <FileUp aria-hidden className="h-6 w-6 shrink-0 text-navy" />
                <span className="min-w-0 truncate">{file ? file.name : 'Choose an AIS CSV (time, lat, lon, sog, cog)'}</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
            <label className="flex flex-col gap-1 text-sm font-bold">
              Test the model by injecting an anomaly (optional)
              <select value={inject} onChange={(e) => setInject(e.target.value)} className={`${inputClass} font-normal`}>
                {INJECT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <Button size="lg" onClick={run} disabled={!canRun || busy} className="md:self-start">
            <Activity aria-hidden className="h-5 w-5" />
            {busy ? 'Analysing…' : 'Analyse'}
          </Button>
        </div>
      )}

      <div className="mt-6">
        {status.loading && <Loading text="Checking the C1 model…" />}
        {busy && <Loading text="Running the C1 model…" />}
        {error && <ErrorMessage message={error} onRetry={run} />}
        {result && <Result result={result} />}
      </div>
    </section>
  );
}

function Result({ result }: { result: AnalyseResult }) {
  const s = result.summary;
  const [selected, setSelected] = useState<number | null>(null);

  const bounds = useMemo(() => {
    if (!result.track.length) return null;
    const lats = result.track.map((p) => p.lat);
    const lons = result.track.map((p) => p.lon);
    return [
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)],
    ] as [[number, number], [number, number]];
  }, [result]);

  // one polyline per track segment
  const segments = useMemo(() => {
    const out: [number, number][][] = [];
    let cur: [number, number][] = [];
    let last = -1;
    for (const p of result.track) {
      if (p.track !== last && cur.length) {
        out.push(cur);
        cur = [];
      }
      cur.push([p.lat, p.lon]);
      last = p.track;
    }
    if (cur.length) out.push(cur);
    return out;
  }, [result]);

  const axis = { stroke: colors.line, tick: { fill: colors.muted, fontSize: 12, fontFamily: fonts.sans.join(',') } };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Pings analysed" value={s.pings.toLocaleString()} note={`${s.windows.toLocaleString()} windows`} />
        <StatCard label="Anomaly events" value={s.events} note={`${s.flagged_windows} windows above threshold`} />
        <StatCard
          label="Injected test anomalies found"
          value={s.injected_windows ? `${Math.round((s.injected_caught / s.injected_windows) * 100)}%` : '—'}
          note={s.injected_windows ? `${s.injected_caught} of ${s.injected_windows} windows` : 'none injected'}
        />
        <StatCard label="Run time" value={`${s.runtime_ms} ms`} note={`threshold ${s.threshold}`} />
      </div>

      <MapView label="Vessel track with detected anomalies" height="md">
        {segments.map((seg, i) => (
          <Polyline key={i} positions={seg} pathOptions={{ color: colors.sea, weight: 2 }} />
        ))}
        {result.track
          .filter((p) => p.injected)
          .map((p, i) => (
            <CircleMarker key={`inj-${i}`} center={[p.lat, p.lon]} radius={3} pathOptions={{ color: colors.amber, fillColor: colors.amber, fillOpacity: 1, weight: 1 }} />
          ))}
        {result.events.map((e) => (
          <CircleMarker
            key={e.id}
            center={[e.lat, e.lon]}
            radius={e.id === selected ? 12 : 9}
            eventHandlers={{ click: () => setSelected(e.id) }}
            pathOptions={{ color: e.id === selected ? colors.navy : colors['coral-text'], fillColor: colors['coral-text'], fillOpacity: 0.6, weight: e.id === selected ? 3 : 2 }}
          >
            <Tooltip>
              #{e.id} {e.type} · score {e.max_score.toFixed(2)}
            </Tooltip>
          </CircleMarker>
        ))}
        <FitBounds bounds={bounds} />
      </MapView>
      <MapLegend
        items={[
          { label: 'Vessel track', swatch: 'border-sea bg-sea' },
          { label: 'Detected anomaly', swatch: 'border-coral-text bg-coral-text' },
          { label: 'Injected test anomaly (truth)', swatch: 'border-amber bg-amber' },
        ]}
      />

      <div>
        <h3 className="mb-2 text-lg">Anomaly score over time</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={result.timeline} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={colors.line} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="t" tickFormatter={(t: string) => t.slice(5, 16)} minTickGap={40} {...axis} />
            <YAxis domain={[0, 1]} width={44} {...axis} />
            <ChartTooltip labelFormatter={(t) => formatDateTime(String(t))} formatter={(v) => Number(v).toFixed(3)} />
            <ReferenceLine y={s.threshold} stroke={colors['coral-text']} strokeDasharray="6 4" />
            <Line dataKey="score" name="Anomaly score" stroke={colors.navy} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-sm text-muted">
          Dashed line = alarm threshold ({s.threshold}). Windows above it are flagged. The AIS-gap rule fires only for silences longer
          than {(s.gap_trigger_s / 3600).toFixed(1)} h (learned from the training data); shorter gaps are left to the autoencoder.
        </p>
      </div>

      {result.events.length === 0 ? (
        <p className="rounded border border-line bg-paper-2 p-4">No anomalies found: this track looks normal to the model.</p>
      ) : (
        <DataTable<AnomalyEvent>
          caption="Detected anomaly events"
          rows={result.events}
          rowKey={(e) => String(e.id)}
          selectedKey={selected === null ? null : String(selected)}
          onRowClick={(e) => setSelected(e.id)}
          columns={[
            { header: 'Event', cell: (e) => `#${e.id}` },
            { header: 'Type', cell: (e) => e.type },
            { header: 'Max score', cell: (e) => e.max_score.toFixed(2), numeric: true },
            { header: 'Time', cell: (e) => formatDateTime(e.start) },
            { header: 'Location', cell: (e) => formatLatLon(e.lat, e.lon) },
            {
              header: 'Test check',
              cell: (e) => (e.injected.length ? <Tag tone="good">{`Injected ${e.injected.join(', ')}`}</Tag> : <Tag>Not injected</Tag>),
            },
          ]}
        />
      )}
      <p className="text-sm text-muted">
        Model output – not field-confirmed. Example tracks come from C1's evaluation data (global AIS); injected test anomalies are
        synthetic and shown only to check the model.
      </p>
    </div>
  );
}
