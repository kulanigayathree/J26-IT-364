import type { Bounds, Projector } from '../../data/geo';

export type View = 'probability' | 'uncertainty';

// Colour steps for the forecast grid. The legend shows the same steps.
export const STEPS: Record<View, { limits: number[]; fills: string[]; labels: string[]; swatches: string[] }> = {
  probability: {
    limits: [0.2, 0.4, 0.6],
    fills: ['#f6e7df', '#efc3ae', '#e39878', '#d0603f'],
    labels: ['Under 20%', '20–40%', '40–60%', 'Over 60%'],
    swatches: ['bg-[#f6e7df]', 'bg-[#efc3ae]', 'bg-[#e39878]', 'bg-[#d0603f]'],
  },
  uncertainty: {
    limits: [0.1, 0.2, 0.3],
    fills: ['#dbe6ea', '#a9c2cd', '#5f8597', '#12405a'],
    labels: ['± under 10%', '± 10–20%', '± 20–30%', '± over 30%'],
    swatches: ['bg-[#dbe6ea]', 'bg-[#a9c2cd]', 'bg-[#5f8597]', 'bg-[#12405a]'],
  },
};

/** Map extent of a lat/lon cell grid. */
export function gridBounds(lat: number[], lon: number[], cellSize: number): Bounds {
  const half = cellSize / 2;
  return {
    west: Math.min(...lon) - half,
    east: Math.max(...lon) + half,
    south: Math.min(...lat) - half,
    north: Math.max(...lat) + half,
  };
}

/** Draws a lat/lon grid of values as coloured squares (SVG). Null cells (land) are skipped. */
export function GridCells({
  P,
  lat,
  lon,
  cellSize,
  values,
  fills,
  limits,
  hideBelow,
}: {
  P: Projector;
  lat: number[];
  lon: number[];
  cellSize: number;
  values: (number | null)[][];
  fills: string[];
  /** step boundaries, e.g. [0.2, 0.4, 0.6] → 4 steps */
  limits: number[];
  /** don't draw cells below this value (e.g. 0.5 for 0/1 "actual fishing" grids) */
  hideBelow?: number;
}) {
  const half = cellSize / 2;
  const size = cellSize * P.scale + 0.5;
  const cells = [];
  for (let i = 0; i < lat.length; i++) {
    for (let j = 0; j < lon.length; j++) {
      const v = values[i]?.[j];
      if (v === null || v === undefined) continue;
      if (hideBelow !== undefined && v < hideBelow) continue;
      const step = Math.min(limits.filter((l) => v >= l).length, fills.length - 1);
      const [x, y] = P.project([lon[j] - half, lat[i] + half]);
      cells.push(<rect key={`${i}-${j}`} x={x} y={y} width={size} height={size} fill={fills[step]} fillOpacity={step === 0 ? 0.6 : 0.92} />);
    }
  }
  return <g>{cells}</g>;
}

/** Legend entry with a square swatch. */
export function Swatch({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className={`inline-block size-3 shrink-0 rounded-[2px] ${swatch}`} />
      {label}
    </span>
  );
}
