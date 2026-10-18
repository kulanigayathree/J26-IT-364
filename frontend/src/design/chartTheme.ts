import { colors, fontFamily } from './tokens';

/**
 * Shared props for recharts so every chart in the app looks the same.
 * Spread them onto the matching recharts elements, e.g. <XAxis {...chartTheme.axis} />.
 */
const font = fontFamily.sans.join(', ');

export const chartTheme = {
  axis: {
    stroke: colors.line,
    tick: { fill: colors.muted, fontSize: 12, fontFamily: font },
    tickLine: false,
  },
  grid: {
    stroke: colors.line,
    strokeDasharray: '2 4',
    vertical: false,
  },
  tooltip: {
    contentStyle: {
      background: colors.paper,
      border: `1px solid ${colors.line}`,
      borderRadius: 4,
      fontFamily: font,
      fontSize: 13,
      color: colors.ink,
      boxShadow: 'none',
    },
    labelStyle: { color: colors.navy, fontWeight: 700 },
    cursor: { stroke: colors.line },
  },
  /** Dash patterns so series differ by more than colour. */
  dash: {
    solid: undefined,
    dashed: '6 4',
    dotted: '2 3',
  },
  height: {
    sm: 200,
    md: 280,
  },
} as const;
