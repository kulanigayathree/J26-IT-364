import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Legend } from '@/components/ui';
import { chartTheme } from '@/design/chartTheme';
import { colors } from '@/design/tokens';
import { formatMonth } from '@/lib/format';
import type { MonthlyCover } from '../types';

const pct = (v: unknown) => (typeof v === 'number' ? `${v.toFixed(1)}%` : 'no image');

/** Monthly benthic cover. Gaps are months without a cloud-free image. */
export function CoverChart({ series }: { series: MonthlyCover[] }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={chartTheme.height.md}>
        <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid {...chartTheme.grid} />
          <XAxis
            dataKey="month"
            {...chartTheme.axis}
            tickFormatter={(m: string) => formatMonth(m).replace(' 20', ' ’')}
            minTickGap={16}
          />
          <YAxis {...chartTheme.axis} domain={[0, 100]} unit="%" width={48} />
          <Tooltip
            {...chartTheme.tooltip}
            labelFormatter={(m) => formatMonth(String(m))}
            formatter={pct}
          />
          <Line
            name="Coral"
            dataKey="coral_pct"
            stroke={colors['reef-green']}
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            name="Algae"
            dataKey="algae_pct"
            stroke={colors.amber}
            strokeWidth={2}
            strokeDasharray={chartTheme.dash.dashed}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            name="Sand / rubble"
            dataKey="sand_rubble_pct"
            stroke={colors.muted}
            strokeWidth={2}
            strokeDasharray={chartTheme.dash.dotted}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2">
        <Legend
          direction="row"
          items={[
            { label: 'Coral', color: 'reef-green', shape: 'line' },
            { label: 'Algae', color: 'amber', shape: 'dashed' },
            { label: 'Sand / rubble', color: 'muted', shape: 'dashed' },
          ]}
        />
      </div>
    </div>
  );
}
