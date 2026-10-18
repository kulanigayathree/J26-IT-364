import {
  colors,
  componentColors,
  fillSteps,
  mapStroke,
  severity as severityTokens,
  type ColorToken,
  type ComponentId,
  type FillStep,
  type MapStroke,
  type Severity,
} from './tokens';

/**
 * A map layer style written with token names only. GeoJSONLayer turns it into Leaflet options,
 * so feature code never handles hex values.
 */
export interface MapStyle {
  /** Outline / line colour. */
  stroke: ColorToken;
  weight?: MapStroke;
  /** Dashed outline (used for boundaries and uncertain values). */
  dashed?: boolean;
  /** Fill colour for polygons and points. Omit for outline-only. */
  fill?: ColorToken;
  fillStep?: FillStep;
  /** Point radius in pixels (points are drawn as circle markers). */
  radius?: number;
  /** Draw only the fill, no outline. */
  noStroke?: boolean;
}

export interface LeafletPathStyle {
  color: string;
  weight: number;
  opacity: number;
  dashArray?: string;
  fill: boolean;
  fillColor?: string;
  fillOpacity: number;
  radius: number;
}

export function toLeafletStyle(style: MapStyle, selected = false): LeafletPathStyle {
  const weight = mapStroke[style.weight ?? 'regular'] + (selected ? 2 : 0);
  return {
    color: colors[selected ? 'navy' : style.stroke],
    weight: style.noStroke && !selected ? 0 : weight,
    opacity: style.noStroke && !selected ? 0 : 1,
    dashArray: style.dashed ? '6 4' : undefined,
    fill: Boolean(style.fill),
    fillColor: style.fill ? colors[style.fill] : undefined,
    fillOpacity: style.fill ? (style.fillStep ?? 35) / 100 + (selected ? 0.15 : 0) : 0,
    radius: (style.radius ?? 6) + (selected ? 2 : 0),
  };
}

/** Bin a 0–1 value into one of the four fill steps. */
export function rampStep(value: number): FillStep {
  const index = Math.min(fillSteps.length - 1, Math.max(0, Math.floor(value * fillSteps.length)));
  return fillSteps[index];
}

/** Ready-made styles. Use these before writing your own MapStyle. */
export const mapStyles = {
  /** A component's own layer colour (Overview map, legends). */
  component(id: ComponentId, options: Partial<MapStyle> = {}): MapStyle {
    const color = componentColors[id];
    return { stroke: color, fill: color, fillStep: 35, weight: 'regular', radius: 6, ...options };
  },
  /** Points or areas coloured by severity. */
  severity(level: Severity, options: Partial<MapStyle> = {}): MapStyle {
    const color = severityTokens[level].color;
    return { stroke: color, fill: color, fillStep: 55, weight: 'regular', radius: 7, ...options };
  },
  /** Sequential value (0–1) shown as fill opacity of one colour. */
  ramp(value: number, color: ColorToken, options: Partial<MapStyle> = {}): MapStyle {
    return { stroke: color, fill: color, fillStep: rampStep(value), noStroke: true, ...options };
  },
  /** Tracks and routes. */
  track(color: ColorToken = 'sea', options: Partial<MapStyle> = {}): MapStyle {
    return { stroke: color, weight: 'thin', ...options };
  },
  /** Reference points such as ports. */
  place(options: Partial<MapStyle> = {}): MapStyle {
    return {
      stroke: 'navy',
      fill: 'paper',
      fillStep: 75,
      weight: 'regular',
      radius: 5,
      ...options,
    };
  },
  /** EEZ and other administrative boundaries. */
  boundary: { stroke: 'sea', weight: 'regular', dashed: true } satisfies MapStyle,
};
