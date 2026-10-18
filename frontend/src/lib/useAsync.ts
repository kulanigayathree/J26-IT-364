import { useCallback, useEffect, useState, type DependencyList } from 'react';
import type { DataSource, Loaded } from './apiClient';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'success'; data: T; source: DataSource; fetchedAt: string };

export type AsyncResult<T> = AsyncState<T> & { reload: () => void };

/**
 * Run a feature api.ts loader and track loading / error / success.
 * Pass the result to <AsyncView> so every page shows the same states.
 *
 *   const spills = useAsync((signal) => fetchSpills(signal), []);
 */
export function useAsync<T>(
  load: (signal: AbortSignal) => Promise<Loaded<T>>,
  deps: DependencyList,
): AsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    load(controller.signal).then(
      (result) => {
        if (!controller.signal.aborted) setState({ status: 'success', ...result });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: 'error',
          error: error instanceof Error ? error : new Error('Something went wrong.'),
        });
      },
    );
    return () => controller.abort();
    // `load` is usually an inline arrow; callers list its inputs in `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload };
}
