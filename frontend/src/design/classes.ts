import type { ColorToken, FillStep } from './tokens';

/**
 * Static class names per colour token. Tailwind only generates classes it can see written out in
 * full, so shared components look classes up here instead of building `bg-${color}` strings.
 */
export const bgClass: Record<ColorToken, string> = {
  navy: 'bg-navy',
  'navy-deep': 'bg-navy-deep',
  coral: 'bg-coral',
  'coral-text': 'bg-coral-text',
  amber: 'bg-amber',
  sea: 'bg-sea',
  'reef-green': 'bg-reef-green',
  paper: 'bg-paper',
  'paper-2': 'bg-paper-2',
  ink: 'bg-ink',
  muted: 'bg-muted',
  line: 'bg-line',
};

export const textClass: Record<ColorToken, string> = {
  navy: 'text-navy',
  'navy-deep': 'text-navy-deep',
  coral: 'text-coral',
  'coral-text': 'text-coral-text',
  amber: 'text-amber',
  sea: 'text-sea',
  'reef-green': 'text-reef-green',
  paper: 'text-paper',
  'paper-2': 'text-paper-2',
  ink: 'text-ink',
  muted: 'text-muted',
  line: 'text-line',
};

export const borderClass: Record<ColorToken, string> = {
  navy: 'border-navy',
  'navy-deep': 'border-navy-deep',
  coral: 'border-coral',
  'coral-text': 'border-coral-text',
  amber: 'border-amber',
  sea: 'border-sea',
  'reef-green': 'border-reef-green',
  paper: 'border-paper',
  'paper-2': 'border-paper-2',
  ink: 'border-ink',
  muted: 'border-muted',
  line: 'border-line',
};

/** Translucent fill matching a map fill step. These classes are safelisted in tailwind.config.ts. */
export function fillClass(color: ColorToken, step: FillStep): string {
  return `bg-${color}/${step}`;
}
