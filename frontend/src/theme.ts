/**
 * The app's colours and fonts (Ocean AI design). tailwind.config.ts uses these, so classes like
 * bg-deep, text-tide or border-line come from here. Do not add other colours.
 */
export const colors = {
  /** darkest navy: hero, footer */
  abyss: '#061a26',
  /** primary dark: headings, buttons, selected states */
  deep: '#0b2d40',
  'deep-2': '#12405a',
  /** teal: links, icons, accents */
  tide: '#1d7f7e',
  /** light teal: accents on dark backgrounds */
  shallow: '#8cc9c1',
  /** page background */
  paper: '#f7f4ee',
  /** alternate panels */
  sand: '#ece6da',
  line: '#dbd3c4',
  ink: '#12222d',
  muted: '#56656f',
  coral: '#d0603f',
  'coral-soft': '#f0c9b8',
  /** medium severity / warnings */
  amber: '#c08a2b',
  'amber-text': '#9a6b17',
  'amber-soft': '#fbf5e8',
  white: '#ffffff',
};

export const fonts = {
  /** headings */
  display: ['Newsreader', 'Georgia', 'serif'],
  /** body and UI */
  body: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
  /** small labels, numbers, coordinates */
  mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
};

/** Map / chart colours for severity. */
export const severityColor = {
  low: colors.tide,
  medium: colors.amber,
  high: '#c4502f',
} as const;
