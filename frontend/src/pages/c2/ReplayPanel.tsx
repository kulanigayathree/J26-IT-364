import { useState } from 'react';
import { motion } from 'framer-motion';
import { History } from 'lucide-react';
import { getC2Replay, getC2ReplayStatus } from '../../api/c2';
import { useApi } from '../../api/client';
import { SeaMap } from '../../components/SeaMap';
import { ErrorMessage, Field, Loading, Notice, Panel, Segmented, StatRow, actionBtn, inputCls } from '../../components/ui';
import { formatDate } from '../../format';
import type { ReplayResult } from '../../types/c2';
import { GridCells, STEPS, Swatch, gridBounds } from './grid';

type Show = 'forecast' | 'uncertainty' | 'actual' | 'compare';

/** "Try the model": show the C2 model's saved 2025 test forecast for a chosen date, next to what really happened. */
export function ReplayPanel() {
  const status = useApi(getC2ReplayStatus, []);
  const [date, setDate] = useState('');
  const [model, setModel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReplayResult | null>(null);
  const [lead, setLead] = useState(1);
  const [show, setShow] = useState<Show>('compare');

  const s = status.data;
  const chosenDate = date || s?.first_date || '';
  const chosenModel = model || s?.models[0]?.key || 'ensemble';

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await getC2Replay(chosenDate, chosenModel));
      setLead(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the forecast.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Try the model: compare a forecast with what really happened" icon={<History className="size-5 text-coral" strokeWidth={1.75} />}>
      <p className="max-w-[720px] text-[14.5px] leading-[1.65] text-muted">
        Pick a day in the 2025 test period (never used for training). You see the C2 model’s 3-day forecast for that day, its
        uncertainty, and the fishing activity that actually happened (Global Fishing Watch).
      </p>

      {status.loading && <Loading text="Checking the C2 model results…" />}
      {status.error && <div className="mt-4"><ErrorMessage message={status.error} onRetry={status.reload} /></div>}
      {s && !s.available && <div className="mt-4"><Notice>{s.message}</Notice></div>}

      {s?.available && (
        <>
          <p className="mt-2 font-mono text-[11.5px] text-muted">
            Saved test forecasts from the C2 notebooks (calibrated, MC dropout).{s.best_model ? ` Best model: ${s.best_model}.` : ''}
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <Field label="Forecast day 1">
              <input
                type="date"
                value={chosenDate}
                min={s.first_date ?? undefined}
                max={s.last_date ?? undefined}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Model">
              <select value={chosenModel} onChange={(e) => setModel(e.target.value)} className={inputCls}>
                {s.models.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
            <button type="button" onClick={run} disabled={!chosenDate || busy} className={actionBtn}>
              <History className="size-4" strokeWidth={1.75} />
              {busy ? 'Loading…' : 'Show forecast'}
            </button>
          </div>
        </>
      )}

      {error && <div className="mt-5"><ErrorMessage message={error} onRetry={run} /></div>}
      {result && <Result result={result} lead={lead} setLead={setLead} show={show} setShow={setShow} />}
    </Panel>
  );
}

function Result({
  result,
  lead,
  setLead,
  show,
  setShow,
}: {
  result: ReplayResult;
  lead: number;
  setLead: (n: number) => void;
  show: Show;
  setShow: (s: Show) => void;
}) {
  const day = result.leads.find((l) => l.lead === lead) ?? result.leads[0];
  const m = day.metrics;
  const options: { value: Show; label: string }[] = [
    { value: 'compare', label: 'Forecast vs actual' },
    { value: 'forecast', label: 'Forecast' },
    ...(day.uncertainty ? [{ value: 'uncertainty' as const, label: 'Uncertainty' }] : []),
    { value: 'actual', label: 'Actual' },
  ];
  const grid = { lat: result.lat, lon: result.lon, cellSize: result.cell_size };
  const half = result.cell_size / 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
      className="mt-6 space-y-6 border-t border-line pt-6"
    >
      <p className="font-mono text-[11.5px] text-muted">
        {result.model_label} · input data up to {formatDate(result.issued_after)} · loaded in {result.runtime_ms} ms
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        <Segmented
          label="Forecast day"
          value={lead}
          onChange={setLead}
          options={result.leads.map((l) => ({ value: l.lead, label: `Day ${l.lead} · ${formatDate(l.date).replace(/ \d{4}$/, '')}` }))}
        />
        <Segmented label="Show on map" value={show} onChange={setShow} options={options} />
      </div>

      <StatRow
        items={[
          { label: 'Real fishing cells', value: m.fishing_cells, note: `of ${m.sea_cells} sea cells` },
          { label: 'Found in top 10%', value: m.top10_capture === null ? '—' : `${Math.round(m.top10_capture * 100)}%`, note: 'of real fishing' },
          { label: 'ROC-AUC', value: m.roc_auc ?? '—', note: '0.5 = random, 1 = perfect' },
          { label: 'PR-AUC', value: m.pr_auc ?? '—', note: 'main score (fishing is rare)' },
        ]}
      />

      <figure>
        <div className="overflow-hidden rounded-[4px] border border-line">
          <SeaMap
            bounds={gridBounds(result.lat, result.lon, result.cell_size)}
            label={`C2 forecast for ${formatDate(day.date)}`}
            under={(P) => (
              <>
                {(show === 'forecast' || show === 'compare') && (
                  <GridCells P={P} {...grid} values={day.probability} fills={STEPS.probability.fills} limits={STEPS.probability.limits} />
                )}
                {show === 'uncertainty' && day.uncertainty && (
                  <GridCells P={P} {...grid} values={day.uncertainty} fills={STEPS.uncertainty.fills} limits={STEPS.uncertainty.limits} />
                )}
                {show === 'actual' && <GridCells P={P} {...grid} values={day.actual} fills={['#0b2d40']} limits={[]} hideBelow={0.5} />}
              </>
            )}
            over={(P) =>
              show === 'compare' ? (
                <g fill="#0b2d40">
                  {result.lat.flatMap((la, i) =>
                    result.lon.map((lo, j) => {
                      if ((day.actual[i]?.[j] ?? 0) < 0.5) return null;
                      const [x, y] = P.project([lo, la]);
                      return <circle key={`${i}-${j}`} cx={x} cy={y} r={Math.max(2, Math.min(4, half * P.scale * 0.35))} />;
                    }),
                  )}
                </g>
              ) : null
            }
          />
        </div>
        <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-muted">
          {(show === 'forecast' || show === 'compare') &&
            STEPS.probability.labels.map((label, i) => <Swatch key={label} swatch={STEPS.probability.swatches[i]} label={`Forecast ${label}`} />)}
          {show === 'uncertainty' && STEPS.uncertainty.labels.map((label, i) => <Swatch key={label} swatch={STEPS.uncertainty.swatches[i]} label={label} />)}
          {show === 'actual' && <Swatch swatch="bg-deep" label="Real fishing that day" />}
          {show === 'compare' && (
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-deep" />
              Real fishing that day
            </span>
          )}
        </figcaption>
      </figure>
      <p className="text-[12.5px] leading-[1.6] text-muted">Real fishing = cells with fishing activity detected by Global Fishing Watch on that day.</p>
    </motion.div>
  );
}
