import { useEffect, type ReactNode } from 'react';
import { FlaskConical } from 'lucide-react';
import type { ModelMeta } from '../types/common';
import { formatDateTime } from '../format';
import { Disclaimer } from './Disclaimer';
import { EmptyState } from './EmptyState';
import { ErrorMessage } from './ErrorMessage';
import { Loading } from './Loading';

interface Props<T extends ModelMeta> {
  code: string;
  title: string;
  description: string;
  /** result of useApi(...) for the page's /data call */
  state: { data: T | null; error: string | null; loading: boolean; reload: () => void };
  isEmpty: (data: T) => boolean;
  emptyMessage?: string;
  disclaimer?: ReactNode;
  children: (data: T) => ReactNode;
}

/**
 * The same layout for every component page: title, then loading / error / no-data / content,
 * then "Model: …, updated …" and a disclaimer.
 */
export function ComponentPage<T extends ModelMeta>({
  code,
  title,
  description,
  state,
  isEmpty,
  emptyMessage,
  disclaimer,
  children,
}: Props<T>) {
  useEffect(() => {
    document.title = `${code} ${title} · Ocean AI`;
  }, [code, title]);

  const { data, error, loading, reload } = state;

  return (
    <>
      <header className="mb-6 border-b border-line pb-4">
        <p className="text-sm font-bold uppercase tracking-wide text-coral-text">{code}</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl">{title}</h1>
          {data?.is_sample && (
            <span className="inline-flex items-center gap-1 rounded border border-amber bg-paper px-2 py-0.5 text-xs font-bold text-ink">
              <FlaskConical aria-hidden className="h-3 w-3 text-amber" /> Sample data
            </span>
          )}
        </div>
        <p className="mt-1 max-w-3xl font-serif text-muted">{description}</p>
      </header>

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : !data || isEmpty(data) ? (
        <EmptyState message={emptyMessage ?? 'No data yet. The model has not produced any results.'} />
      ) : (
        <div className="flex flex-col gap-6">
          {children(data)}
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">
              Model: {data.model_name} (v{data.model_version}), updated {formatDateTime(data.generated_at)}
            </p>
            <Disclaimer>{disclaimer}</Disclaimer>
          </div>
        </div>
      )}
    </>
  );
}

/** Row of 3–4 stat cards. */
export function StatRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{children}</div>;
}
