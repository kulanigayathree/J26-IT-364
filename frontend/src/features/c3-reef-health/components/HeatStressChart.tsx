import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Legend } from '@/components/ui';
import { chartTheme } from '@/design/chartTheme';
import { colors } from '@/design/tokens';
import { formatMonth } from '@/lib/format';
import type { HeatStressMonth } from '../types';

/** NOAA Coral Reef Watch alert levels (degree heating weeks). */
const BLEACHING_LIKELY = 4;
const MORTALITY_LIKELY = 8;

/** Heat stress this year vs the same months last year, with bleaching thresholds. */
export function HeatStressChart({ months }: { months: HeatStressMonth[] }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={chartTheme.height.md}>
        <BarChart data={months} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barGap={2}>
          <CartesianGrid {...chartTheme.grid} />
          <XAxis
            dataKey="month"
            {...chartTheme.axis}
            tickFormatter={(m: string) => formatMonth(m).slice(0, 3)}
            interval={0}
          />
          <YAxis {...chartTheme.axis} width={48} />
          <Tooltip
            {...chartTheme.tooltip}
            cursor={{ fill: colors['paper-2'] }}
            labelFormatter={(m) => formatMonth(String(m))}
            formatter={(v) => `${Number(v).toFixed(1)} DHW`}
          />
          <ReferenceLine
            y={BLEACHING_LIKELY}
            stroke={colors.amber}
            strokeDasharray={chartTheme.dash.dashed}
          />
          <ReferenceLine
            y={MORTALITY_LIKELY}
            stroke={colors['coral-text']}
            strokeDasharray={chartTheme.dash.dashed}
          />
          <Bar
            name="Last year"
            dataKey="dhw_previous_year"
            fill={colors.line}
            isAnimationActive={false}
          />
          <Bar name="This year" dataKey="dhw" fill={colors.navy} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2">
        <Legend
          direction="row"
          items={[
            { label: 'This year', color: 'navy', fillStep: 75 },
            { label: 'Same month last year', color: 'line', fillStep: 75 },
            { label: `${BLEACHING_LIKELY} DHW: bleaching likely`, color: 'amber', shape: 'dashed' },
            {
              label: `${MORTALITY_LIKELY} DHW: mortality likely`,
              color: 'coral-text',
              shape: 'dashed',
            },
          ]}
        />
      </div>
    </div>
  );
}
