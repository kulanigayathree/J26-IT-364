import { useState, type ChangeEvent } from 'react';
import { ImageUp, ScanSearch } from 'lucide-react';
import { detectSpill, getC4DetectStatus } from '../../api/c4';
import { useApi } from '../../api/client';
import { Button } from '../../components/Button';
import { DataTable } from '../../components/DataTable';
import { ErrorMessage } from '../../components/ErrorMessage';
import { Loading } from '../../components/Loading';
import { Tag } from '../../components/SeverityBadge';
import { StatCard } from '../../components/StatCard';
import { colors } from '../../theme';
import type { DetectedPatch, DetectResult } from '../../types/c4';

type Step = 'original' | 'filtered' | 'mask' | 'result';

const STEPS: { id: Step; label: string; help: string }[] = [
  { id: 'original', label: '1. Original', help: 'The uploaded SAR image (grayscale).' },
  { id: 'filtered', label: '2. Speckle filter', help: 'Median filter removes radar speckle noise.' },
  { id: 'mask', label: '3. Dark spots', help: 'Pixels much darker than the surrounding sea, cleaned into patches.' },
  { id: 'result', label: '4. Result', help: 'Each patch classified by the C4 model as oil or look-alike.' },
];

const VERDICT = {
  oil: { label: 'Oil', tone: 'bad' as const, color: colors['coral-text'] },
  'look-alike': { label: 'Look-alike', tone: 'info' as const, color: colors.sea },
  'dark spot': { label: 'Dark spot', tone: 'warn' as const, color: colors.amber },
};

/** "Try the model": upload a SAR image, run the C4 pipeline, show each step and the result. */
export function DetectPanel() {
  const status = useApi(getC4DetectStatus, []);
  const [file, setFile] = useState<File | null>(null);
  const [isCoast, setIsCoast] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DetectResult | null>(null);
  const [step, setStep] = useState<Step>('result');
  const [selected, setSelected] = useState<number | null>(null);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setResult(null);
    setError(null);
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setSelected(null);
    try {
      setResult(await detectSpill(file, isCoast));
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detection failed.');
    } finally {
      setBusy(false);
    }
  };

  const classified = result?.classifier.available ?? status.data?.available ?? false;

  return (
    <section className="rounded border border-line bg-paper p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <ScanSearch aria-hidden className="h-6 w-6 text-coral" />
        <h2 className="text-xl">Try the model: detect oil in a SAR image</h2>
      </div>
      <p className="mt-1 max-w-3xl font-serif text-muted">
        Upload a Sentinel-1 SAR image. The C4 model filters radar noise, finds dark spots, measures 19 shape
        and darkness features for each one, and classifies it as oil or a look-alike (e.g. low wind).
      </p>

      {status.data && !status.data.available && (
        <p className="mt-3 rounded border border-l-4 border-line border-l-amber bg-paper-2 px-3 py-2 text-sm">
          {status.data.message} Steps 1–3 still run; put the trained C4 model (.joblib) in{' '}
          <code>data/external/c4/</code> to classify oil vs look-alike.
        </p>
      )}
      {status.data?.available && (
        <p className="mt-3 text-sm text-muted">
          Model: {status.data.name} · oil threshold {status.data.threshold}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
        <label className="flex flex-1 cursor-pointer items-center gap-3 rounded border border-dashed border-muted bg-paper-2 px-4 py-3 hover:border-navy">
          <ImageUp aria-hidden className="h-6 w-6 shrink-0 text-navy" />
          <span className="min-w-0 truncate">
            {file ? file.name : 'Choose a SAR image (PNG, JPG or GeoTIFF)'}
          </span>
          <input type="file" accept=".png,.jpg,.jpeg,.tif,.tiff,image/*" onChange={onFile} className="sr-only" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isCoast} onChange={(e) => setIsCoast(e.target.checked)} className="h-5 w-5" />
          Image includes coastline
        </label>
        <Button size="lg" onClick={run} disabled={!file || busy}>
          <ScanSearch aria-hidden className="h-5 w-5" />
          {busy ? 'Detecting…' : 'Detect'}
        </Button>
      </div>

      <div className="mt-6">
        {busy && <Loading text="Running the C4 model…" />}
        {error && <ErrorMessage message={error} onRetry={run} />}
        {result && <Result result={result} classified={classified} step={step} setStep={setStep} selected={selected} setSelected={setSelected} />}
      </div>
    </section>
  );
}

function Result({
  result,
  classified,
  step,
  setStep,
  selected,
  setSelected,
}: {
  result: DetectResult;
  classified: boolean;
  step: Step;
  setStep: (s: Step) => void;
  selected: number | null;
  setSelected: (id: number | null) => void;
}) {
  const image = step === 'result' ? result.images.original : result.images[step];
  const lookAlikes = result.patches.filter((p) => p.verdict === 'look-alike').length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Dark patches" value={result.n_patches} />
        <StatCard label="Oil" value={classified ? result.n_oil : '—'} note={classified ? undefined : 'no model file'} />
        <StatCard label="Look-alikes" value={classified ? lookAlikes : '—'} />
        <StatCard label="Run time" value={`${result.runtime_ms} ms`} note={`${result.width} × ${result.height} px`} />
      </div>

      <div role="tablist" aria-label="Processing steps" className="flex flex-wrap gap-2">
        {STEPS.map((s) => (
          <button
            key={s.id}
            role="tab"
            type="button"
            aria-selected={step === s.id}
            onClick={() => setStep(s.id)}
            className={`h-10 rounded border px-3 text-sm font-bold ${step === s.id ? 'border-navy bg-navy text-paper' : 'border-line bg-paper text-navy hover:bg-paper-2'}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted">{STEPS.find((s) => s.id === step)?.help}</p>

      <div className="relative overflow-hidden rounded border border-line bg-ink">
        <img src={image} alt={`SAR image, step: ${step}`} className="block h-auto w-full" />
        {step === 'result' && (
          <svg viewBox={`0 0 ${result.width} ${result.height}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            {result.patches.map((p) => {
              const v = VERDICT[p.verdict];
              const isSel = p.id === selected;
              return (
                <g key={p.id} onClick={() => setSelected(p.id)} className="cursor-pointer">
                  <polygon
                    points={p.outline.map(([x, y]) => `${x},${y}`).join(' ')}
                    fill={v.color}
                    fillOpacity={isSel ? 0.45 : 0.25}
                    stroke={isSel ? colors.paper : v.color}
                    strokeWidth={isSel ? 4 : 2.5}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {step === 'result' && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {(classified ? (['oil', 'look-alike'] as const) : (['dark spot'] as const)).map((k) => (
            <li key={k} className="flex items-center gap-2">
              <span aria-hidden className={`inline-block h-3 w-3 rounded-full border ${k === 'oil' ? 'border-coral-text bg-coral-text' : k === 'look-alike' ? 'border-sea bg-sea' : 'border-amber bg-amber'}`} />
              {VERDICT[k].label}
            </li>
          ))}
        </ul>
      )}

      {result.patches.length === 0 ? (
        <p className="rounded border border-line bg-paper-2 p-4">No dark spots found in this image.</p>
      ) : (
        <DataTable<DetectedPatch>
          caption="Detected patches"
          rows={result.patches}
          rowKey={(p) => String(p.id)}
          selectedKey={selected === null ? null : String(selected)}
          onRowClick={(p) => {
            setSelected(p.id);
            setStep('result');
          }}
          columns={[
            { header: 'Patch', cell: (p) => `#${p.id}` },
            { header: 'Verdict', cell: (p) => <Tag tone={VERDICT[p.verdict].tone}>{VERDICT[p.verdict].label}</Tag> },
            { header: 'Oil probability', cell: (p) => (p.probability === null ? '—' : `${Math.round(p.probability * 100)}%`), numeric: true },
            { header: 'Area', cell: (p) => `${p.area_px.toLocaleString()} px`, numeric: true },
            { header: 'Elongation', cell: (p) => p.elongation.toFixed(1), numeric: true },
            { header: 'Contrast', cell: (p) => p.contrast.toFixed(2), numeric: true },
          ]}
        />
      )}
      <p className="text-sm text-muted">Model output – not field-confirmed. A detected slick must be verified before any action.</p>
    </div>
  );
}
