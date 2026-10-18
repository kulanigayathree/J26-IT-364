import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Badges keep their own paper background so text contrast holds on any panel.
 * `warning` uses ink text with an amber border and mark, because amber text fails 4.5:1.
 */
export type BadgeTone = 'neutral' | 'info' | 'positive' | 'warning' | 'accent' | 'solid';

const tones: Record<BadgeTone, string> = {
  neutral: 'border-line bg-paper text-ink',
  info: 'border-sea bg-paper text-sea',
  positive: 'border-reef-green bg-paper text-reef-green',
  warning: 'border-amber bg-paper text-ink',
  accent: 'border-coral-text bg-paper text-coral-text',
  solid: 'border-navy bg-navy text-paper',
};

const markColor: Record<BadgeTone, string> = {
  neutral: 'text-muted',
  info: 'text-sea',
  positive: 'text-reef-green',
  warning: 'text-amber',
  accent: 'text-coral-text',
  solid: 'text-paper',
};

export interface BadgeProps {
  tone?: BadgeTone;
  icon?: LucideIcon;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', icon: Icon, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded border px-2 py-0.5 text-xs font-bold',
        tones[tone],
        className,
      )}
    >
      {Icon && <Icon aria-hidden className={cn('h-3 w-3 shrink-0', markColor[tone])} />}
      <span className="truncate">{children}</span>
    </span>
  );
}
