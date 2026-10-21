import { useMemo } from 'react';
import { Rectangle } from 'react-leaflet';

/** Opacity for each colour step (same steps as the legend). */
export const OPACITY = [0.1, 0.25, 0.45, 0.7];

/** Draws a lat/lon grid of values as coloured squares. Cells with null (land) are skipped. */
export function GridLayer({
  lat,
  lon,
  cellSize,
  values,
  color,
  limits,
  hideBelow,
}: {
  lat: number[];
  lon: number[];
  cellSize: number;
  values: (number | null)[][];
  color: string;
  /** step boundaries, e.g. [0.2, 0.4, 0.6] → 4 steps */
  limits: number[];
  /** don't draw cells below this value (e.g. 0.5 for "actual fishing" 0/1 grids) */
  hideBelow?: number;
}) {
  const cells = useMemo(() => {
    const half = cellSize / 2;
    const out = [];
    for (let i = 0; i < lat.length; i++) {
      for (let j = 0; j < lon.length; j++) {
        const v = values[i]?.[j];
        if (v === null || v === undefined) continue;
        if (hideBelow !== undefined && v < hideBelow) continue;
        const step = limits.filter((l) => v >= l).length;
        out.push(
          <Rectangle
            key={`${i}-${j}`}
            bounds={[
              [lat[i] - half, lon[j] - half],
              [lat[i] + half, lon[j] + half],
            ]}
            interactive={false}
            pathOptions={{ stroke: false, fillColor: color, fillOpacity: OPACITY[Math.min(step, OPACITY.length - 1)] }}
          />,
        );
      }
    }
    return out;
  }, [lat, lon, cellSize, values, color, limits, hideBelow]);
  return <>{cells}</>;
}
