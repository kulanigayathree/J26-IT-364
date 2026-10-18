import type { ReactNode } from 'react';
import type { AsyncResult } from '@/lib/useAsync';
import { EmptyState, ErrorState, LoadingState } from './States';

export interface AsyncViewProps<T> {
  state: AsyncResult<T>;
  /** Return true when the loaded data has nothing to show. */
  isEmpty?: (data: T) => boolean;
  loadingLabel?: string;
  empty?: { title?: string; message?: ReactNode; action?: ReactNode };
  errorTitle?: string;
  compact?: boolean;
  children: (data: T) => ReactNode;
}

/**
 * Renders the shared loading, error and empty states, then `children(data)`.
 * Use it for every block that loads data so all pages behave the same.
 */
export function AsyncView<T>({
  state,
  isEmpty,
  loadingLabel,
  empty,
  errorTitle,
  compact,
  children,
}: AsyncViewProps<T>) {
  if (state.status === 'loading') return <LoadingState label={loadingLabel} compact={compact} />;
  if (state.status === 'error') {
    return (
      <ErrorState title={errorTitle} error={state.error} onRetry={state.reload} compact={compact} />
    );
  }
  if (isEmpty?.(state.data)) {
    return (
      <EmptyState
        title={empty?.title}
        message={empty?.message}
        action={empty?.action}
        compact={compact}
      />
    );
  }
  return <>{children(state.data)}</>;
}
