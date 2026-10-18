import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/cn';

export type DisclaimerKind = 'satellite' | 'candidate' | 'forecast' | 'anomaly' | 'custom';

const defaults: Record<Exclude<DisclaimerKind, 'custom'>, { title: string; text: string }> = {
  satellite: {
    title: 'Satellite-derived, not field-confirmed.',
    text: 'Values are estimated from satellite images and need confirmation by a field survey.',
  },
  candidate: {
    title: 'Candidate, not proof.',
    text: 'Vessels are ranked as possible sources from AIS and SAR evidence. Attribution must be verified by the responsible authority before any action.',
  },
  forecast: {
    title: 'Model forecast with uncertainty.',
    text: 'Use alongside weather warnings and official advisories. Conditions at sea can change quickly.',
  },
  anomaly: {
    title: 'Flag for review, not evidence.',
    text: 'Anomaly scores point analysts to unusual behaviour. They do not show that a vessel broke any law.',
  },
};

export interface DisclaimerProps {
  kind?: DisclaimerKind;
  title?: string;
  children?: ReactNode;
  className?: string;
}

/** Plain statement of what the data can and cannot show. Required on every component page. */
export function Disclaimer({ kind = 'custom', title, children, className }: DisclaimerProps) {
  const preset = kind === 'custom' ? undefined : defaults[kind];
  return (
    <aside
      className={cn(
        'flex gap-3 rounded border border-l-4 border-line border-l-amber bg-paper-2 p-3 text-sm',
        className,
      )}
    >
      <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
      <p className="min-w-0 font-serif text-ink">
        {(title ?? preset?.title) && (
          <strong className="font-sans">{title ?? preset?.title} </strong>
        )}
        {children ?? preset?.text}
      </p>
    </aside>
  );
}
