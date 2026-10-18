import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface StatTileProps {
  label: string;
  value: ReactNode;
  unit?: string;
  /** Where the number comes from, e.g. "Sentinel-1, 17 Oct 2026". */
  source?: ReactNode;
  /** Extra context such as a change or a badge. */
  note?: ReactNode;
  emphasis?: boolean;
  className?: string;
}

export function StatTile({ label, value, unit, source, note, emphasis, className }: StatTileProps) {
  return (
    <div
      className={cn(
        'min-w-0 rounded border border-line bg-paper p-4',
        emphasis && 'border-l-4 border-l-coral',
        className,
      )}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 flex flex-wrap items-baseline gap-1">
        <span className="text-2xl font-bold text-navy">{value}</span>
        {unit && <span className="text-sm text-muted">{unit}</span>}
      </p>
      {note && <div className="mt-1 text-sm">{note}</div>}
      {source && <p className="mt-2 text-xs text-muted">Source: {source}</p>}
    </div>
  );
}
