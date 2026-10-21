import type { Config } from 'tailwindcss';
import { colors, fonts } from './src/theme';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // Only the project colours from theme.ts (Tailwind's default palette is switched off).
    colors: { transparent: 'transparent', current: 'currentColor', ...colors },
    fontFamily: fonts,
    extend: {
      maxWidth: { page: '1240px' },
      transitionTimingFunction: { soft: 'cubic-bezier(0.23, 1, 0.32, 1)' },
    },
  },
  plugins: [],
} satisfies Config;
