import { useState } from 'react';
import { Legend, type LegendItem } from '@/components/ui';

export interface MapLegendProps {
  items: LegendItem[];
  title?: string;
}

/** Open from md up; collapsed on phones so it does not cover the map. */
function startsOpen(): boolean {
  return typeof window === 'undefined' || window.matchMedia('(min-width: 768px)').matches;
}

/** Collapsible legend in the bottom-right corner of a MapView. Pass it as MapView `overlay`. */
export function MapLegend({ items, title = 'Legend' }: MapLegendProps) {
  const [open] = useState(startsOpen);
  return (
    <details
      open={open}
      className="absolute bottom-8 right-2 z-map-overlay max-w-64 rounded border border-line bg-paper shadow"
    >
      <summary className="cursor-pointer select-none px-3 py-2 text-xs font-bold uppercase tracking-wide text-navy">
        {title}
      </summary>
      <div className="max-h-48 overflow-y-auto px-3 pb-3">
        <Legend items={items} />
      </div>
    </details>
  );
}
