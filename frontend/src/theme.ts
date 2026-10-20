/**
 * The app's colours and fonts. tailwind.config.ts uses these, so classes like bg-navy,
 * text-coral-text or border-line come from here. Do not add other colours.
 *
 * Contrast notes (WCAG AA needs 4.5:1 for text):
 * - coral is for accents and borders only; buttons use coral-text with paper text (4.9:1).
 * - amber is not a text colour; medium severity uses ink text with an amber border.
 */
export const colors = {
  navy: '#13294B',
  'navy-deep': '#0F2433',
  coral: '#D9653B',
  'coral-text': '#B44D27',
  amber: '#C47A1C',
  sea: '#1B5E8C',
  'reef-green': '#2F7D6B',
  paper: '#FBF8F2',
  'paper-2': '#F3EFE6',
  ink: '#2E3440',
  muted: '#5B6470',
  line: '#C8CDD3',
};

export const fonts = {
  /** Headings and UI (buttons, navigation, tables). */
  sans: ['Carlito', 'Arial', 'sans-serif'],
  /** Body text (paragraphs). */
  serif: ['Caladea', 'Georgia', 'serif'],
};

/** Map colours for severity, used for markers and shapes. */
export const severityColor = {
  low: colors['reef-green'],
  medium: colors.amber,
  high: colors['coral-text'],
} as const;
