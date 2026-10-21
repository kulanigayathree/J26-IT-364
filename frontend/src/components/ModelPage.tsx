import type { ReactNode } from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDateTime } from '../format';
import { MODULES, type ModelId } from '../modules';
import type { ModelMeta } from '../types/common';
import { Footer } from './Footer';
import { Nav } from './Nav';
import { EmptyState, ErrorMessage, Loading, SampleBadge } from './ui';

interface State<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/** Shared frame for the four model pages: tabs, header, loading/error/empty states and the model footnote. */
export function ModelPage<T extends ModelMeta>({
  id,
  state,
  isEmpty,
  emptyMessage,
  children,
}: {
  id: ModelId;
  state: State<T>;
  isEmpty: (data: T) => boolean;
  emptyMessage: string;
  children: (data: T) => ReactNode;
}) {
  const meta = MODULES.find((m) => m.id === id)!;
  const { data, error, loading, reload } = state;

  return (
    <>
      <Nav forceSolid />
      <main className="pt-[68px]">
        <div className="border-b border-line bg-sand/50">
          <nav aria-label="Models" className="mx-auto flex max-w-page items-center gap-1 overflow-x-auto px-5 md:px-8">
            <Link
              to="/#models"
              className="mr-3 flex h-12 shrink-0 items-center gap-2 pr-3 text-[14px] whitespace-nowrap text-muted transition-colors duration-150 hover:text-ink"
            >
              <ArrowLeft className="size-4" strokeWidth={1.75} />
              All models
            </Link>
            {MODULES.map((m) => (
              <Link
                key={m.id}
                to={m.path}
                aria-current={m.id === id ? 'page' : undefined}
                className={`flex h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-[14px] whitespace-nowrap transition-colors duration-150 ${
                  m.id === id ? 'border-deep text-deep' : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                <span className="font-mono text-[11.5px]">{m.code}</span>
                {m.short}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mx-auto max-w-page px-5 pb-16 pt-10 md:px-8">
          <header className="border-b border-line pb-7">
            <p className="font-mono text-[12px] text-coral">{meta.code}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="font-display text-[30px] leading-[1.15] tracking-[-0.01em] text-deep md:text-[36px]">{meta.title}</h1>
              {data?.is_sample && <SampleBadge />}
            </div>
            <p className="mt-2 max-w-[680px] text-[15px] leading-[1.65] text-muted">{meta.subtitle}</p>
          </header>

          <div className="pt-8">
            {loading && !data && <Loading />}
            {error && <ErrorMessage message={error} onRetry={reload} />}
            {data && (isEmpty(data) ? <EmptyState message={emptyMessage} /> : <div className="space-y-10">{children(data)}</div>)}
          </div>

          <footer className="mt-12">
            {data && (
              <p className="font-mono text-[11.5px] text-muted">
                Model: {data.model_name} ({data.model_version}), updated {formatDateTime(data.generated_at)}
              </p>
            )}
            <p className="mt-3 flex items-start gap-2.5 rounded-[3px] border border-coral-soft border-l-[3px] border-l-coral bg-white px-4 py-3 text-[13.5px] leading-[1.55] text-ink/80">
              <Info className="mt-0.5 size-4 shrink-0 text-coral" strokeWidth={1.75} />
              {meta.caveat}
            </p>
          </footer>
        </div>
      </main>
      <Footer />
    </>
  );
}

/** Small legend entry: coloured dot + label. */
export function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className={`inline-block size-2.5 shrink-0 rounded-full ${swatch}`} />
      {label}
    </span>
  );
}

/** Two-column key/value list used in detail panels. */
export function DetailList({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="border-t border-line">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[110px_1fr] gap-3 border-b border-line py-2.5 text-[14px]">
          <dt className="font-mono text-[12px] leading-[1.7] text-muted">{k}</dt>
          <dd className="text-ink/85">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
