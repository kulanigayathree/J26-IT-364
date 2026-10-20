import { CircleAlert, OctagonAlert, TriangleAlert } from 'lucide-react';
import type { Severity } from '../types/common';

const look = {
  low: { label: 'Low', icon: CircleAlert, cls: 'border-reef-green text-reef-green', iconCls: 'text-reef-green' },
  // amber fails contrast as text, so the word stays ink and amber marks the border + icon
  medium: { label: 'Medium', icon: TriangleAlert, cls: 'border-amber text-ink', iconCls: 'text-amber' },
  high: { label: 'High', icon: OctagonAlert, cls: 'border-coral-text text-coral-text', iconCls: 'text-coral-text' },
};

/** Severity always shows a word and an icon, never colour only. */
export function SeverityBadge({ level }: { level: Severity }) {
  const { label, icon: Icon, cls, iconCls } = look[level];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded border bg-paper px-2 py-0.5 text-xs font-bold ${cls}`}>
      <Icon aria-hidden className={`h-3 w-3 ${iconCls}`} />
      {label}
    </span>
  );
}

/** Simple outlined label for statuses ("Active", "At risk" …). */
export function Tag({ children, tone = 'neutral' }: { children: string; tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info' }) {
  const cls = {
    neutral: 'border-line text-ink',
    good: 'border-reef-green text-reef-green',
    warn: 'border-amber text-ink',
    bad: 'border-coral-text text-coral-text',
    info: 'border-sea text-sea',
  }[tone];
  return <span className={`inline-block whitespace-nowrap rounded border bg-paper px-2 py-0.5 text-xs font-bold ${cls}`}>{children}</span>;
}
