import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import { analyseTrack, getC1AnalyseStatus } from '../../api/c1';
import { useApi } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { Legend } from '../../components/ModelPage';
import { SeaMap, niceGraticule, niceScaleKm } from '../../components/SeaMap';
import { ErrorMessage, Field, Loading, Notice, Panel, StatRow, Tag, actionBtn, inputCls } from '../../components/ui';
import { boundsAround, type LonLat } from '../../data/geo';
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

/** "Try the model": run the trained C1 model on a recorded vessel track. */
export function AnalysePanel() {
  const status = useApi(getC1AnalyseStatus, []);
  const [exampleId, setExampleId] = useState('');
  const [inject, setInject] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyseResult | null>(null);

  const examples = status.data?.examples ?? [];
  const chosenExample = exampleId || examples[0]?.id || '';

  // Like C1's DEMO mode: recorded tracks run through the model, with optional injected anomalies (no uploads, no live feed).
  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await analyseTrack({ exampleId: chosenExample, inject }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.');
    } finally {
      setBusy(false);
    }
  };

  const m = status.data?.metrics;

  return (
    <Panel title="Try the model: check a vessel track for anomalies" icon={<Activity className="size-5 text-coral" strokeWidth={1.75} />}>
      <p className="max-w-[720px] text-[14.5px] leading-[1.65] text-muted">
        The C1 model reads a vessel’s AIS track in windows of 10 pings, scores how unusual each window is with a time-decay GRU
        autoencoder plus an AIS-gap rule, and names the type of unusual behaviour.
      </p>
      {status.data?.available && m && (
        <p className="mt-2 font-mono text-[11.5px] text-muted">
          Model: {status.data.model} · test results: ROC-AUC {m.roc_auc?.toFixed(2) ?? '—'}, precision {pct(m.precision)}, recall {pct(m.recall)},
          false-alarm rate {pct(m.far)}
        </p>
      )}

      {status.loading && <Loading text="Checking the C1 model…" />}
      {status.error && <div className="mt-4"><ErrorMessage message={status.error} onRetry={status.reload} /></div>}
      {status.data && !status.data.available && <div className="mt-4"><Notice>{status.data.message}</Notice></div>}

      {status.data?.available && (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Recorded vessel track (C1 evaluation data)">
              <select value={chosenExample} onChange={(e) => { setExampleId(e.target.value); setResult(null); }} className={inputCls}>
                {examples.map((x) => (
                  <option key={x.id} value={x.id}>
                    Vessel {x.mmsi} · {x.pings} pings · {x.injected.length ? `has test anomaly: ${x.injected.join(', ')}` : 'no test anomaly'}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Test the model by injecting an anomaly (optional)">
              <select value={inject} onChange={(e) => { setInject(e.target.value); setResult(null); }} className={inputCls}>
                {INJECT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <button type="button" onClick={run} disabled={!chosenExample || busy} className={`mt-5 ${actionBtn}`}>
            <Activity className="size-4" strokeWidth={1.75} />
            {busy ? 'Analysing…' : 'Analyse'}
          </button>
        </>
      )}

      {busy && <Loading text="Running the C1 model…" />}
      {error && <div className="mt-5"><ErrorMessage message={error} onRetry={run} /></div>}
      {result && <TrackResult result={result} />}
    </Panel>
  );
}

const axis = { stroke: colors.line, tick: { fill: colors.muted, fontSize: 11, fontFamily: fonts.mono.join(',') } };

function TrackResult({ result }: { result: AnalyseResult }) {
  const s = result.summary;
  const [selected, setSelected] = useState<number | null>(null);

  const points = useMemo(() => result.track.map((p) => [p.lon, p.lat] as LonLat), [result]);
  const bounds = useMemo(() => (points.length ? boundsAround(points, 0.3, 0.6) : null), [points]);

  // one line per track segment
  const segments = useMemo(() => {
    const out: LonLat[][] = [];
    let cur: LonLat[] = [];
    let last = -1;
    for (const p of result.track) {
      if (p.track !== last && cur.length) {
        out.push(cur);
        cur = [];
      }
      cur.push([p.lon, p.lat]);
      last = p.track;
    }
    if (cur.length) out.push(cur);
    return out;
  }, [result]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
      className="mt-6 space-y-6 border-t border-line pt-6"
    >
      <p className="font-display text-[20px] text-deep">
        {s.events
          ? `${s.events} anomaly event${s.events === 1 ? '' : 's'} found — ${s.flagged_windows} of ${s.windows} windows look unusual.`
          : `No unusual behaviour found in ${s.windows} windows.`}
      </p>

      <StatRow
        items={[
          { label: 'Pings analysed', value: s.pings.toLocaleString(), note: `${s.windows.toLocaleString()} windows` },
          { label: 'Anomaly events', value: s.events, note: `${s.flagged_windows} windows above threshold` },
          {
            label: 'Injected anomalies found',
            value: s.injected_windows ? `${Math.round((s.injected_caught / s.injected_windows) * 100)}%` : '—',
            note: s.injected_windows ? `${s.injected_caught} of ${s.injected_windows} windows` : 'none injected',
          },
          { label: 'Run time', value: `${s.runtime_ms} ms`, note: `threshold ${s.threshold}` },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <figure>
          <figcaption className="mb-2 font-mono text-[11.5px] text-muted">Anomaly score over time</figcaption>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.timeline} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <CartesianGrid stroke={colors.line} strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="t" tickFormatter={(t: string) => t.slice(5, 16)} minTickGap={40} {...axis} />
                <YAxis domain={[0, 1]} width={44} {...axis} />
                <ChartTooltip labelFormatter={(t) => formatDateTime(String(t))} formatter={(v) => Number(v).toFixed(3)} />
                <ReferenceLine y={s.threshold} stroke={colors.coral} strokeDasharray="4 3" />
                <Line dataKey="score" name="Anomaly score" stroke={colors['deep-2']} strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[12.5px] leading-[1.6] text-muted">
            Dashed line = alarm threshold ({s.threshold}). The AIS-gap rule fires only for silences longer than {(s.gap_trigger_s / 3600).toFixed(1)} h;
            shorter gaps are left to the autoencoder.
          </p>
        </figure>
        <figure>
          <figcaption className="mb-2 font-mono text-[11.5px] text-muted">Track, with detected anomalies in coral</figcaption>
          {bounds && (
            <div className="overflow-hidden rounded-[3px] border border-line">
              <SeaMap
                bounds={bounds}
                label="Map of the analysed vessel track with detected anomalies"
                graticule={niceGraticule(bounds)}
                scaleKm={niceScaleKm(bounds)}
                showPorts={false}
                over={(P) => (
                  <g>
                    {segments.map((seg, i) => (
                      <path key={i} d={P.path(seg, false)} fill="none" stroke="#12405a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                    ))}
                    {result.track
                      .filter((p) => p.injected)
                      .map((p, i) => {
                        const [x, y] = P.project([p.lon, p.lat]);
                        return <circle key={i} cx={x} cy={y} r="3.5" fill="#c08a2b" />;
                      })}
                    {result.events.map((e) => {
                      const [x, y] = P.project([e.lon, e.lat]);
                      return (
                        <g key={e.id} onClick={() => setSelected(e.id)} className="cursor-pointer">
                          <title>{`#${e.id} ${e.type} · score ${e.max_score.toFixed(2)}`}</title>
                          {selected === e.id && <circle cx={x} cy={y} r="16" fill="none" stroke="#12222d" strokeWidth="2" />}
                          <circle cx={x} cy={y} r="10" fill="#d0603f" fillOpacity="0.85" stroke="#fff" strokeWidth="1.5" />
                        </g>
                      );
                    })}
                  </g>
                )}
              />
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-muted">
            <Legend swatch="bg-deep-2" label="Vessel track" />
            <Legend swatch="bg-coral" label="Detected anomaly" />
            <Legend swatch="bg-amber" label="Injected test anomaly (truth)" />
          </div>
        </figure>
      </div>

      {result.events.length === 0 ? (
        <p className="border-t border-line pt-4 text-[14px] text-muted">No anomalies found: this track looks normal to the model.</p>
      ) : (
        <DataTable<AnomalyEvent>
          caption="Detected anomaly events"
          rows={result.events}
          rowKey={(e) => String(e.id)}
          selectedKey={selected === null ? null : String(selected)}
          onRowClick={(e) => setSelected(e.id)}
          minWidth="min-w-[760px]"
          columns={[
            { header: 'Event', cell: (e) => `#${e.id}`, mono: true },
            { header: 'Type', cell: (e) => e.type },
            { header: 'Max score', cell: (e) => e.max_score.toFixed(2), numeric: true, mono: true },
            { header: 'Time', cell: (e) => formatDateTime(e.start) },
            { header: 'Location', cell: (e) => formatLatLon(e.lat, e.lon), mono: true },
            {
              header: 'Test check',
              cell: (e) => (e.injected.length ? <Tag tone="good">{`Injected ${e.injected.join(', ')}`}</Tag> : <Tag>Not injected</Tag>),
            },
          ]}
        />
      )}
      <p className="text-[12.5px] leading-[1.6] text-muted">
        Example tracks come from C1’s evaluation data (global AIS); injected test anomalies are synthetic and shown only to check the model.
      </p>
    </motion.div>
  );
}
