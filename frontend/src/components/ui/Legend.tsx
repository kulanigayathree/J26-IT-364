import { bgClass, borderClass, fillClass } from '@/design/classes';
import type { ColorToken, FillStep } from '@/design/tokens';
import { cn } from '@/lib/cn';

export type LegendShape = 'area' | 'line' | 'dashed' | 'dot' | 'outline';

export interface LegendItem {
  label: string;
  color: ColorToken;
  shape?: LegendShape;
  /** Matches the map fill step for `area` swatches. */
  fillStep?: FillStep;
  description?: string;
}

export interface LegendProps {
  items: LegendItem[];
  title?: string;
  direction?: 'column' | 'row';
}

function Swatch({ color, shape = 'area', fillStep = 55 }: LegendItem) {
  const common = 'inline-block shrink-0';
  switch (shape) {
    case 'line':
      return <span aria-hidden className={cn(common, 'h-0.5 w-5', bgClass[color])} />;
    case 'dashed':
      return (
        <span
          aria-hidden
          className={cn(common, 'h-0 w-5 border-t-2 border-dashed', borderClass[color])}
        />
      );
    case 'dot':
      return (
        <span
          aria-hidden
          className={cn(
            common,
            'h-3 w-3 rounded-full border-2',
            borderClass[color],
            fillClass(color, fillStep),
          )}
        />
      );
    case 'outline':
      return (
        <span
          aria-hidden
          className={cn(common, 'h-3 w-4 border-2 border-dashed', borderClass[color])}
        />
      );
    default:
      return (
        <span
          aria-hidden
          className={cn(common, 'h-3 w-4 border', borderClass[color], fillClass(color, fillStep))}
        />
      );
  }
}

/** Key for map layers and charts. Labels always carry the meaning, swatches only support it. */
export function Legend({ items, title, direction = 'column' }: LegendProps) {
  return (
    <div className="min-w-0">
      {title && (
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">{title}</p>
      )}
      <ul
        className={cn(
          'flex gap-x-4 gap-y-1.5 text-sm',
          direction === 'row' ? 'flex-row flex-wrap' : 'flex-col',
        )}
      >
        {items.map((item) => (
          <li key={`${item.label}-${item.color}`} className="flex items-center gap-2">
            <Swatch {...item} />
            <span>
              {item.label}
              {item.description && <span className="text-muted"> · {item.description}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
