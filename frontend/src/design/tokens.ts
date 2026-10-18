/**
 * Ocean AI design tokens: the single source of truth for the look of the app.
 *
 * tailwind.config.ts builds the whole Tailwind theme from this file, so a class such as
 * `bg-navy`, `text-sm` or `p-4` always means a value defined here. Tailwind's default palette,
 * fonts and sizes are switched off, so `bg-blue-500` does nothing and `text-[#123456]` is a lint
 * error inside src/features.
 *
 * Changing a token changes every page. Open a PR to src/design/ and ask all members to review.
 */

/* ------------------------------------------------------------------ colours */

export const colors = {
  /** Primary: top bar, headings, active navigation. */
  navy: '#13294B',
  /** Dark backgrounds. */
  'navy-deep': '#0F2433',
  /**
   * Accent for fills, borders, focus marks and map highlights.
   * Below 4.5:1 for text on light backgrounds and for paper text on top of it: never use as a text
   * colour or as a fill behind text. Primary buttons use `coral-text` instead.
   */
  coral: '#D9653B',
  /** Accent text on light backgrounds, and the fill of primary buttons (paper text on it passes). */
  'coral-text': '#B44D27',
  /** Warnings / medium severity. Not a text colour (fails 4.5:1): use for borders, fills, icons. */
  amber: '#C47A1C',
  /** Links, secondary accent, map boundaries, focus rings. */
  sea: '#1B5E8C',
  /** Positive / healthy. Text use only on `paper` (4.6:1). */
  'reef-green': '#2F7D6B',
  /** Page background and cards. */
  paper: '#FBF8F2',
  /** Alternate panels, table headers, hovered rows. */
  'paper-2': '#F3EFE6',
  /** Body text. */
  ink: '#2E3440',
  /** Secondary text. */
  muted: '#5B6470',
  /** Borders and dividers. */
  line: '#C8CDD3',
} as const;

export type ColorToken = keyof typeof colors;

/**
 * Every text/background pair the UI kit uses. /styleguide computes the contrast of each one and
 * flags anything below WCAG AA (4.5:1). Add a pair here before using a new combination.
 */
export const textPairs: ReadonlyArray<{ text: ColorToken; background: ColorToken; use: string }> = [
  { text: 'ink', background: 'paper', use: 'Body text' },
  { text: 'ink', background: 'paper-2', use: 'Body text on alternate panels' },
  { text: 'muted', background: 'paper', use: 'Secondary text' },
  { text: 'muted', background: 'paper-2', use: 'Secondary text on alternate panels' },
  { text: 'navy', background: 'paper', use: 'Headings' },
  { text: 'navy', background: 'paper-2', use: 'Headings on alternate panels' },
  { text: 'sea', background: 'paper', use: 'Links' },
  { text: 'sea', background: 'paper-2', use: 'Links on alternate panels' },
  { text: 'coral-text', background: 'paper', use: 'Accent text, high severity' },
  { text: 'reef-green', background: 'paper', use: 'Positive text (badges)' },
  { text: 'paper', background: 'navy', use: 'Top bar, solid badges' },
  { text: 'line', background: 'navy', use: 'Secondary text on the top bar' },
  { text: 'paper', background: 'navy-deep', use: 'Dark panels' },
  { text: 'paper', background: 'coral-text', use: 'Primary button' },
];

/* ------------------------------------------------------------------ typography */

export const fontFamily = {
  /** Headings and UI. Carlito is metric-compatible with Calibri. */
  sans: ['Carlito', 'Arial', 'sans-serif'],
  /** Long text (descriptions, About, method notes). */
  serif: ['Caladea', 'Georgia', 'serif'],
};

/** The only type scale. [font-size, line-height]. */
export const fontSize: Record<string, [string, { lineHeight: string }]> = {
  xs: ['0.75rem', { lineHeight: '1rem' }],
  sm: ['0.875rem', { lineHeight: '1.25rem' }],
  base: ['1rem', { lineHeight: '1.5rem' }],
  lg: ['1.125rem', { lineHeight: '1.625rem' }],
  xl: ['1.375rem', { lineHeight: '1.875rem' }],
  '2xl': ['1.75rem', { lineHeight: '2.25rem' }],
};

/* ------------------------------------------------------------------ spacing & shape */

/** 4px base grid. These keys are the only spacing values (p-4, gap-6, w-64 …). */
export const spacing: Record<string, string> = {
  0: '0',
  px: '1px',
  '0.5': '0.125rem',
  1: '0.25rem',
  '1.5': '0.375rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  32: '8rem',
  40: '10rem',
  48: '12rem',
  64: '16rem',
  80: '20rem',
  96: '24rem',
};

export const radius: Record<string, string> = {
  none: '0',
  DEFAULT: '4px',
  full: '9999px',
};

/** Little shadow: only for things that float over the map. */
export const shadow: Record<string, string> = {
  none: 'none',
  DEFAULT: '0 1px 2px rgba(15, 36, 51, 0.12)',
};

export const screens: Record<string, string> = {
  sm: '640px',
  md: '768px',
  /** Desktop layout (sidebar) starts here. */
  lg: '1024px',
  xl: '1280px',
};

/** Named sizes for the app frame and maps (classes like h-map-md, w-sidebar). */
export const layout = {
  height: {
    topbar: '3.5rem',
    'map-sm': '18rem',
    'map-md': 'max(20rem, 55vh)',
    'map-lg': 'max(24rem, 70vh)',
    sidebar: 'calc(100dvh - 3.5rem)',
  },
  width: {
    sidebar: '16rem',
  },
  maxWidth: {
    content: '90rem',
    prose: '68ch',
    narrow: '28rem',
  },
  zIndex: {
    /** Overlays drawn above Leaflet panes (which go up to 1000 inside the map). */
    'map-overlay': '1001',
    nav: '1100',
  },
};

/* ------------------------------------------------------------------ meaning */

export type Severity = 'low' | 'medium' | 'high';

/** Severity always shows its label and an icon too, never colour alone. */
export const severity: Record<Severity, { label: string; color: ColorToken }> = {
  low: { label: 'Low', color: 'reef-green' },
  medium: { label: 'Medium', color: 'amber' },
  high: { label: 'High', color: 'coral-text' },
};

export type ComponentId = 'c1' | 'c2' | 'c3' | 'c4';

/** Map layer colour per component, used on the Overview map and in each component's legend. */
export const componentColors: Record<ComponentId, ColorToken> = {
  c1: 'sea',
  c2: 'coral',
  c3: 'reef-green',
  c4: 'amber',
};

/** Line weights for map layers, in pixels. */
export const mapStroke = {
  hairline: 0.5,
  thin: 1,
  regular: 2,
  bold: 3,
} as const;
export type MapStroke = keyof typeof mapStroke;

/**
 * Opacity steps (percent) for map fills and legend swatches. Sequential values such as a
 * probability are binned into these four steps, so the map and its legend always match.
 */
export const fillSteps = [15, 35, 55, 75] as const;
export type FillStep = (typeof fillSteps)[number];
