import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ImagePlus, ScanSearch, X } from 'lucide-react';
import { detectSpill, getC4DetectStatus } from '../../api/c4';
import { useApi } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { Legend } from '../../components/ModelPage';
import { ErrorMessage, Loading, Notice, Panel, Segmented, StatRow, Tag, actionBtn } from '../../components/ui';
import type { DetectedPatch, DetectResult } from '../../types/c4';

type Step = 'original' | 'filtered' | 'mask' | 'result';

const STEPS: { value: Step; label: string; help: string }[] = [
  { value: 'original', label: '1. Original', help: 'The uploaded SAR image (grayscale).' },
  { value: 'filtered', label: '2. Speckle filter', help: 'Median filter removes radar speckle noise.' },
  { value: 'mask', label: '3. Dark spots', help: 'Pixels much darker than the surrounding sea, cleaned into patches.' },
  { value: 'result', label: '4. Result', help: 'Each patch classified by the C4 model as oil or look-alike.' },
];

const VERDICT = {
  oil: { label: 'Oil', tone: 'bad' as const, color: '#d0603f', swatch: 'bg-coral' },
  'look-alike': { label: 'Look-alike', tone: 'info' as const, color: '#8cc9c1', swatch: 'bg-shallow' },
  'dark spot': { label: 'Dark spot', tone: 'warn' as const, color: '#c08a2b', swatch: 'bg-amber' },
};

/** "Try the model": upload a SAR image, run the C4 pipeline, show each step and the result. */
export function DetectPanel() {
  const status = useApi(getC4DetectStatus, []);
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isCoast, setIsCoast] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DetectResult | null>(null);
  const [step, setStep] = useState<Step>('result');
  const [selected, setSelected] = useState<number | null>(null);

  const choose = (f: File | null) => {
    setFile(f);
    setResult(null);
    setError(null);
    if (!f && input.current) input.current.value = '';
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
    <Panel title="Try the model: detect oil in a SAR image" icon={<ScanSearch className="size-5 text-coral" strokeWidth={1.75} />}>
      <p className="max-w-[760px] text-[14.5px] leading-[1.65] text-muted">
        Upload a Sentinel-1 SAR image. The C4 model filters radar noise, finds dark spots, measures 19 shape and darkness features for
        each one, and classifies it as oil or a look-alike (e.g. low wind).
      </p>
      {status.data?.available && (
        <p className="mt-2 font-mono text-[11.5px] text-muted">
          Model: {status.data.name} · oil threshold {status.data.threshold}
        </p>
      )}
      {status.data && !status.data.available && (
        <div className="mt-4">
          <Notice>
            {status.data.message} Steps 1–3 still run; put the trained C4 model (.joblib) in{' '}
            <code className="font-mono text-[12px]">data/external/c4/</code> to classify oil vs look-alike.
          </Notice>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            choose(e.dataTransfer.files?.[0] ?? null);
          }}
          className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-[4px] border border-dashed border-ink/30 bg-sand/40 px-4"
        >
          <ImagePlus className="size-5 shrink-0 text-muted" strokeWidth={1.5} />
          <button type="button" onClick={() => input.current?.click()} className="min-w-0 flex-1 truncate text-left text-[14px] text-ink/80 hover:text-ink">
            {file ? file.name : 'Choose a SAR image (PNG, JPG or GeoTIFF)'}
          </button>
          {file && (
            <button type="button" aria-label="Remove image" onClick={() => choose(null)} className="text-muted hover:text-ink">
              <X className="size-4" strokeWidth={1.75} />
            </button>
          )}
          <input
            ref={input}
            type="file"
            accept=".png,.jpg,.jpeg,.tif,.tiff,image/*"
            className="hidden"
            onChange={(e) => choose(e.target.files?.[0] ?? null)}
          />
        </div>
        <label className="flex items-center gap-2 text-[13.5px] whitespace-nowrap text-ink/80">
          <input type="checkbox" checked={isCoast} onChange={(e) => setIsCoast(e.target.checked)} className="size-4 accent-tide" />
          Image includes coastline
        </label>
        <button type="button" onClick={run} disabled={!file || busy} className={`${actionBtn} h-12`}>
          <ScanSearch className="size-4" strokeWidth={1.75} />
          {busy ? 'Detecting…' : 'Detect'}
        </button>
      </div>

      {busy && <Loading text="Running the C4 model…" />}
      {error && <div className="mt-5"><ErrorMessage message={error} onRetry={run} /></div>}
      {result && <Result result={result} classified={classified} step={step} setStep={setStep} selected={selected} setSelected={setSelected} />}
    </Panel>
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
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
      className="mt-6 space-y-6 border-t border-line pt-6"
    >
      <StatRow
        items={[
          { label: 'Dark patches', value: result.n_patches },
          { label: 'Oil', value: classified ? result.n_oil : '—', note: classified ? undefined : 'no model file' },
          { label: 'Look-alikes', value: classified ? lookAlikes : '—' },
          { label: 'Run time', value: `${result.runtime_ms} ms`, note: `${result.width} × ${result.height} px` },
        ]}
      />

      <div>
        <Segmented label="Processing step" value={step} onChange={setStep} options={STEPS} />
        <p className="mt-2 text-[13px] text-muted">{STEPS.find((s) => s.value === step)?.help}</p>
      </div>

      <figure>
        <div className="relative overflow-hidden rounded-[3px] border border-line bg-abyss">
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
                      stroke={isSel ? '#f7f4ee' : v.color}
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
          <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-muted">
            {(classified ? (['oil', 'look-alike'] as const) : (['dark spot'] as const)).map((k) => (
              <Legend key={k} swatch={VERDICT[k].swatch} label={VERDICT[k].label} />
            ))}
          </figcaption>
        )}
      </figure>

      {result.patches.length === 0 ? (
        <p className="border-t border-line pt-4 text-[14px] text-muted">No dark spots found in this image.</p>
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
            { header: 'Patch', cell: (p) => `#${p.id}`, mono: true },
            { header: 'Verdict', cell: (p) => <Tag tone={VERDICT[p.verdict].tone}>{VERDICT[p.verdict].label}</Tag> },
            { header: 'Oil probability', cell: (p) => (p.probability === null ? '—' : `${Math.round(p.probability * 100)}%`), numeric: true },
            { header: 'Area', cell: (p) => `${p.area_px.toLocaleString()} px`, numeric: true },
            { header: 'Elongation', cell: (p) => p.elongation.toFixed(1), numeric: true, mono: true },
            { header: 'Contrast', cell: (p) => p.contrast.toFixed(2), numeric: true, mono: true },
          ]}
        />
      )}
      <p className="text-[12.5px] text-muted">A detected slick must be verified before any action.</p>
    </motion.div>
  );
}
