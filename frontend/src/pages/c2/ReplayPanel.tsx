import { useState } from 'react';
import { History } from 'lucide-react';
import { CircleMarker } from 'react-leaflet';
import { getC2Replay, getC2ReplayStatus } from '../../api/c2';
import { useApi } from '../../api/client';
import { Button } from '../../components/Button';
import { ErrorMessage } from '../../components/ErrorMessage';
import { inputClass } from '../../components/FormField';
import { Loading } from '../../components/Loading';
import { MapLegend } from '../../components/MapLegend';
import { MapView } from '../../components/MapView';
import { StatCard } from '../../components/StatCard';
import { formatDate } from '../../format';
import { colors } from '../../theme';
import type { ReplayResult } from '../../types/c2';
import { GridLayer } from './GridLayer';
import { ChoiceButtons, STEPS } from './shared';

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
    <section className="rounded border border-line bg-paper p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <History aria-hidden className="h-6 w-6 text-coral" />
        <h2 className="text-xl">Try the model: compare a forecast with what really happened</h2>
      </div>
      <p className="mt-1 max-w-3xl font-serif text-muted">
        Pick a day in the 2025 test period (never used for training). You see the C2 model's 3-day forecast for that day,
        its uncertainty, and the fishing activity that actually happened (Global Fishing Watch).
      </p>

      {status.loading && <Loading text="Checking the C2 model results…" />}
      {status.error && <p className="mt-3 text-sm text-coral-text">{status.error}</p>}
      {s && !s.available && (
        <p className="mt-3 rounded border border-l-4 border-line border-l-amber bg-paper-2 px-3 py-2 text-sm">{s.message}</p>
      )}

      {s?.available && (
        <>
          <p className="mt-3 text-sm text-muted">
            Saved test forecasts from the C2 notebooks (calibrated, MC dropout).{s.best_model ? ` Best model: ${s.best_model}.` : ''}
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3 md:items-end">
            <label className="flex flex-col gap-1 text-sm font-bold">
              Forecast day 1
              <input
                type="date"
                value={chosenDate}
                min={s.first_date ?? undefined}
                max={s.last_date ?? undefined}
                onChange={(e) => setDate(e.target.value)}
                className={`${inputClass} font-normal`}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-bold">
              Model
              <select value={chosenModel} onChange={(e) => setModel(e.target.value)} className={`${inputClass} font-normal`}>
                {s.models.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <Button size="lg" onClick={run} disabled={!chosenDate || busy}>
              <History aria-hidden className="h-5 w-5" />
              {busy ? 'Loading…' : 'Show forecast'}
            </Button>
          </div>
        </>
      )}

      <div className="mt-6">
        {error && <ErrorMessage message={error} onRetry={run} />}
        {result && <Result result={result} lead={lead} setLead={setLead} show={show} setShow={setShow} />}
      </div>
    </section>
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
    { value: 'actual', label: 'Actual fishing' },
  ];
  const grid = { lat: result.lat, lon: result.lon, cellSize: result.cell_size };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        {result.model_label} · input data up to {formatDate(result.issued_after)} · loaded in {result.runtime_ms} ms
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <ChoiceButtons
          label="Forecast day"
          value={lead}
          onChange={setLead}
          options={result.leads.map((l) => ({ value: l.lead, label: `Day ${l.lead} · ${formatDate(l.date).replace(/ \d{4}$/, '')}` }))}
        />
        <ChoiceButtons label="Show on map" value={show} onChange={setShow} options={options} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Real fishing cells" value={m.fishing_cells} note={`of ${m.sea_cells} sea cells`} />
        <StatCard label="Found in top 10%" value={m.top10_capture === null ? '—' : `${Math.round(m.top10_capture * 100)}%`} note="of real fishing, in the 10% highest-forecast cells" />
        <StatCard label="ROC-AUC" value={m.roc_auc ?? '—'} note="0.5 = random, 1 = perfect" />
        <StatCard label="PR-AUC" value={m.pr_auc ?? '—'} note="main score (fishing is rare)" />
      </div>

      <MapView label={`C2 forecast for ${day.date}`} height="lg">
        {(show === 'forecast' || show === 'compare') && (
          <GridLayer {...grid} values={day.probability} color={STEPS.probability.color} limits={STEPS.probability.limits} />
        )}
        {show === 'uncertainty' && day.uncertainty && (
          <GridLayer {...grid} values={day.uncertainty} color={STEPS.uncertainty.color} limits={STEPS.uncertainty.limits} />
        )}
        {show === 'actual' && <GridLayer {...grid} values={day.actual} color={colors.navy} limits={[0.5, 2, 3]} hideBelow={0.5} />}
        {show === 'compare' && <ActualDots lat={result.lat} lon={result.lon} actual={day.actual} />}
      </MapView>
      <MapLegend
        items={[
          ...(show === 'forecast' || show === 'compare'
            ? STEPS.probability.labels.map((label, i) => ({ label: `Forecast ${label}`, swatch: STEPS.probability.swatches[i] }))
            : []),
          ...(show === 'uncertainty' ? STEPS.uncertainty.labels.map((label, i) => ({ label, swatch: STEPS.uncertainty.swatches[i] })) : []),
          ...(show === 'actual' || show === 'compare' ? [{ label: 'Real fishing that day', swatch: 'border-navy bg-navy' }] : []),
        ]}
      />
      <p className="text-sm text-muted">
        Model output – not field-confirmed. Real fishing = cells with fishing activity detected by Global Fishing Watch on that day.
      </p>
    </div>
  );
}

/** Small navy dots on cells where fishing really happened (drawn over the forecast). */
function ActualDots({ lat, lon, actual }: { lat: number[]; lon: number[]; actual: (number | null)[][] }) {
  const dots = [];
  for (let i = 0; i < lat.length; i++) {
    for (let j = 0; j < lon.length; j++) {
      if ((actual[i]?.[j] ?? 0) >= 0.5) dots.push([lat[i], lon[j]] as [number, number]);
    }
  }
  return (
    <>
      {dots.map(([la, lo]) => (
        <CircleMarker
          key={`${la}-${lo}`}
          center={[la, lo]}
          radius={3}
          interactive={false}
          pathOptions={{ color: colors.navy, fillColor: colors.navy, fillOpacity: 1, weight: 1 }}
        />
      ))}
    </>
  );
}
