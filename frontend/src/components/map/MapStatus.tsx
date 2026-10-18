import { CircleX, LoaderCircle } from 'lucide-react';
import type { AsyncState } from '@/lib/useAsync';

export interface MapStatusProps {
  /** The async states of the layers on this map. */
  states: Array<AsyncState<unknown>>;
}

/** Small "Loading layers…" / "A layer failed" chip on top of a MapView. Pass it as `overlay`. */
export function MapStatus({ states }: MapStatusProps) {
  const failed = states.some((s) => s.status === 'error');
  const loading = states.some((s) => s.status === 'loading');
  if (!failed && !loading) return null;
  return (
    <div
      role={failed ? 'alert' : 'status'}
      className="absolute left-14 top-3 z-map-overlay flex items-center gap-2 rounded border border-line bg-paper px-3 py-1.5 text-sm font-bold shadow"
    >
      {failed ? (
        <>
          <CircleX aria-hidden className="h-4 w-4 text-coral-text" />
          Some map layers could not be loaded
        </>
      ) : (
        <>
          <LoaderCircle aria-hidden className="h-4 w-4 animate-spin text-sea" />
          Loading map layers…
        </>
      )}
    </div>
  );
}
