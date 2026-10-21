import { useState, type ChangeEvent } from 'react';
import { FileUp, Layers } from 'lucide-react';
import { classifyReef, getC3ClassifyStatus } from '../../api/c3';
import { useApi } from '../../api/client';
import { Button } from '../../components/Button';
import { DataTable } from '../../components/DataTable';
import { ErrorMessage } from '../../components/ErrorMessage';
import { inputClass } from '../../components/FormField';
import { Loading } from '../../components/Loading';
import { StatCard } from '../../components/StatCard';
import type { ClassCover, ClassifyResult } from '../../types/c3';

/** Same colours the API uses to draw the class map (from theme.ts). */
const SWATCH: Record<string, string> = {
  Sand: 'border-amber bg-amber',
  Rubble: 'border-muted bg-line',
  Rock: 'border-muted bg-muted',
  Seagrass: 'border-reef-green bg-reef-green',
  'Coral/Algae': 'border-coral bg-coral',
  'Microalgal Mats': 'border-sea bg-sea',
};

/** "Try the model": run the C3 benthic classifier on a Sentinel-2 composite. */
export function ClassifyPanel() {
  const status = useApi(getC3ClassifyStatus, []);
  const s = status.data;
  const [source, setSource] = useState<'example' | 'file'>('example');
  const [exampleId, setExampleId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [useMask, setUseMask] = useState(true);
  const [smooth, setSmooth] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClassifyResult | null>(null);

  const hasExamples = (s?.examples.length ?? 0) > 0;
  const mode = hasExamples ? source : 'file';
  const chosen = exampleId || s?.examples[0]?.id || '';
  const canRun = mode === 'example' ? Boolean(chosen) : Boolean(file);

  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(
        await classifyReef(mode === 'example' ? { exampleId: chosen, useMask, smooth } : { file: file ?? undefined, useMask, smooth }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Classification failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded border border-line bg-paper p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Layers aria-hidden className="h-6 w-6 text-coral" />
        <h2 className="text-xl">Try the model: map the reef floor from a satellite image</h2>
      </div>
      <p className="mt-1 max-w-3xl font-serif text-muted">
        The C3 model corrects sun glint in a Sentinel-2 image, measures colour and texture around every 10 m pixel, and
        classifies it as sand, rubble, rock or coral/algae.
      </p>

      {status.loading && <Loading text="Checking the C3 model…" />}
      {status.error && <p className="mt-3 text-sm text-coral-text">{status.error}</p>}
      {s && !s.available && (
        <p className="mt-3 rounded border border-l-4 border-line border-l-amber bg-paper-2 px-3 py-2 text-sm">{s.message}</p>
      )}

      {s?.available && s.model && (
        <>
          <p className="mt-3 text-sm text-muted">
            Model: {s.model.name} ({s.model.experiment}) · spatial cross-validation macro-F1{' '}
            {s.model.cv_macro_f1?.toFixed(2) ?? '—'}, accuracy {s.model.cv_accuracy !== null ? `${Math.round(s.model.cv_accuracy * 100)}%` : '—'}
          </p>
          {s.message && (
            <p className="mt-2 rounded border border-l-4 border-line border-l-amber bg-paper-2 px-3 py-2 text-sm">{s.message}</p>
          )}

          <div className="mt-4 flex flex-col gap-4">
            {hasExamples && (
              <div className="grid max-w-md grid-cols-2 overflow-hidden rounded border border-navy">
                {(['example', 'file'] as const).map((x) => (
                  <button
                    key={x}
                    type="button"
                    aria-pressed={source === x}
                    onClick={() => setSource(x)}
                    className={`h-11 font-bold ${source === x ? 'bg-navy text-paper' : 'bg-paper text-navy hover:bg-paper-2'}`}
                  >
                    {x === 'example' ? 'Reef image' : 'Upload GeoTIFF'}
                  </button>
                ))}
              </div>
            )}

            {mode === 'example' ? (
              <label className="flex max-w-md flex-col gap-1 text-sm font-bold">
                Sentinel-2 composite
                <select value={chosen} onChange={(e) => setExampleId(e.target.value)} className={`${inputClass} font-normal`}>
                  {s.examples.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.site} · composite {x.version}
                      {x.has_reef_mask ? ' · reef mask' : ''}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="flex max-w-xl cursor-pointer items-center gap-3 rounded border border-dashed border-muted bg-paper-2 px-4 py-3 hover:border-navy">
                <FileUp aria-hidden className="h-6 w-6 shrink-0 text-navy" />
                <span className="min-w-0 truncate">
                  {file ? file.name : 'Choose a Sentinel-2 GeoTIFF (bands B2, B3, B4, B8, B11 × 10000)'}
                </span>
                <input
                  type="file"
                  accept=".tif,.tiff"
                  className="sr-only"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            )}

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={useMask} onChange={(e) => setUseMask(e.target.checked)} className="h-5 w-5" />
                Limit to reef area (Allen Coral Atlas mask, if available)
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={smooth} onChange={(e) => setSmooth(e.target.checked)} className="h-5 w-5" />
                Smooth map (3×3 majority filter)
              </label>
            </div>

            <Button size="lg" onClick={run} disabled={!canRun || busy} className="md:self-start">
              <Layers aria-hidden className="h-5 w-5" />
              {busy ? 'Classifying…' : 'Classify'}
            </Button>
          </div>
        </>
      )}

      <div className="mt-6">
        {busy && <Loading text="Running the C3 model… this can take up to 30 seconds for a large image." />}
        {error && <ErrorMessage message={error} onRetry={run} />}
        {result && <Result result={result} />}
      </div>
    </section>
  );
}

function Result({ result }: { result: ClassifyResult }) {
  const top = [...result.cover].sort((a, b) => b.percent - a.percent)[0];
  const coral = result.cover.find((c) => c.name === 'Coral/Algae');
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Coral/Algae cover" value={coral ? `${coral.percent}%` : '—'} note={coral ? `${coral.area_ha} ha` : undefined} />
        <StatCard label="Main class" value={top ? top.name : '—'} note={top ? `${top.percent}%` : undefined} />
        <StatCard label="Pixels classified" value={result.classified_pixels.toLocaleString()} note={`${(result.classified_pixels * 0.01).toFixed(1)} ha · 10 m pixels`} />
        <StatCard label="Run time" value={`${(result.runtime_ms / 1000).toFixed(1)} s`} note={`${result.width} × ${result.height} px`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <figure>
          <img src={result.images.rgb} alt="True-colour satellite image" className="block h-auto w-full rounded border border-line" />
          <figcaption className="mt-1 text-sm text-muted">True colour (Sentinel-2 B4, B3, B2)</figcaption>
        </figure>
        <figure>
          <img src={result.images.classes} alt="Classified reef habitat map" className="block h-auto w-full rounded border border-line" />
          <figcaption className="mt-1 text-sm text-muted">
            Habitat map{result.reef_mask_used ? ' (reef area only)' : ''}
            {result.smoothed ? ', smoothed' : ''}
          </figcaption>
        </figure>
      </div>

      <DataTable<ClassCover>
        caption="Benthic cover by class"
        rows={result.cover}
        rowKey={(c) => String(c.code)}
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
          { header: 'Pixels', cell: (c) => c.pixels.toLocaleString(), numeric: true },
        ]}
      />
      <p className="text-sm text-muted">
        Model output – not field-confirmed. Satellite-derived habitat classes need checking by a dive survey.
      </p>
    </div>
  );
}
