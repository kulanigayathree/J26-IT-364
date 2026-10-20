import type { Config } from 'tailwindcss';
import { colors, fonts } from './src/theme';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // Only the project colours from theme.ts (Tailwind's default palette is switched off).
    colors: { transparent: 'transparent', current: 'currentColor', ...colors },
    fontFamily: fonts,
    borderRadius: { none: '0', DEFAULT: '4px', full: '9999px' },
    boxShadow: { none: 'none', DEFAULT: '0 1px 2px rgba(15, 36, 51, 0.10)' },
    extend: {},
  },
  plugins: [],
} satisfies Config;
