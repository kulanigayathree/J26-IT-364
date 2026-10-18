import type { Config } from 'tailwindcss';
import {
  colors,
  fillSteps,
  fontFamily,
  fontSize,
  layout,
  radius,
  screens,
  shadow,
  spacing,
} from './src/design/tokens';

const colorNames = Object.keys(colors).join('|');

/**
 * The theme is generated from src/design/tokens.ts. Do not add values here: add a token instead.
 * Colours, fonts, font sizes, spacing, radius and shadows REPLACE Tailwind's defaults.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Legend swatches use bg-<token>/<step> built at runtime (src/design/classes.ts).
  safelist: [{ pattern: new RegExp(`^bg-(${colorNames})/(${fillSteps.join('|')})$`) }],
  theme: {
    screens,
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      ...colors,
    },
    fontFamily,
    fontSize,
    spacing,
    borderRadius: radius,
    boxShadow: shadow,
    extend: {
      height: layout.height,
      minHeight: layout.height,
      width: layout.width,
      maxWidth: layout.maxWidth,
      zIndex: layout.zIndex,
    },
  },
  plugins: [],
} satisfies Config;
