import type { ReactNode } from 'react';
import { EEZ, INDIA, PORTS, SRI_LANKA, makeProjector, type Bounds, type Projector } from '../data/geo';

/**
 * Plain SVG basemap of Sri Lankan waters (no map tiles, works offline).
 * Overlays go `under` (below land) or `over` (on top).
 */
export function SeaMap({
  bounds,
  under,
  over,
  label,
  showPorts = true,
  graticule = 1,
  scaleKm = 100,
}: {
  bounds: Bounds;
  under?: (P: Projector) => ReactNode;
  over?: (P: Projector) => ReactNode;
  label: string;
  showPorts?: boolean;
  graticule?: number;
  scaleKm?: number;
}) {
  const P = makeProjector(bounds, 1000);
  const lons: number[] = [];
  const lats: number[] = [];
  for (let l = Math.ceil(bounds.west / graticule) * graticule; l < bounds.east; l += graticule) lons.push(+l.toFixed(2));
  for (let l = Math.ceil(bounds.south / graticule) * graticule; l < bounds.north; l += graticule) lats.push(+l.toFixed(2));
  const midLat = (bounds.north + bounds.south) / 2;
  const kmPerDeg = 111.32 * Math.cos((midLat * Math.PI) / 180);
  const barW = (scaleKm / kmPerDeg) * P.scale;
  const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(graticule < 0.1 ? 2 : 1));
  const ew = (n: number) => `${fmt(Math.abs(n))}°${n < 0 ? 'W' : 'E'}`;
  const ns = (n: number) => `${fmt(Math.abs(n))}°${n < 0 ? 'S' : 'N'}`;

  return (
    <svg viewBox={`0 0 ${P.width} ${P.height}`} className="block h-auto w-full" role="img" aria-label={label}>
      <rect width={P.width} height={P.height} fill="#cfe2e2" />
      <g stroke="#0b2d40" strokeOpacity="0.08">
        {lons.map((lon) => (
          <line key={lon} x1={P.project([lon, 0])[0]} x2={P.project([lon, 0])[0]} y1={0} y2={P.height} />
        ))}
        {lats.map((lat) => (
          <line key={lat} x1={0} x2={P.width} y1={P.project([0, lat])[1]} y2={P.project([0, lat])[1]} />
        ))}
      </g>
      <path d={P.path(EEZ)} fill="none" stroke="#7a6a9a" strokeOpacity="0.55" strokeWidth="1.5" />
      {under?.(P)}
      <path d={P.path(INDIA)} fill="#ece6da" stroke="#b9ae98" strokeWidth="1" />
      <path d={P.path(SRI_LANKA)} fill="#ece6da" stroke="#b9ae98" strokeWidth="1" strokeLinejoin="round" />
      {showPorts && (
        <g fontFamily="IBM Plex Sans, sans-serif" fontSize="13" fill="#56656f">
          {PORTS.map((p) => {
            const [x, y] = P.project(p.at);
            if (x < 0 || y < 0 || x > P.width || y > P.height) return null;
            return (
              <g key={p.name}>
                <circle cx={x} cy={y} r="2.5" fill="#56656f" />
                <text x={x + 7} y={y + 4}>
                  {p.name}
                </text>
              </g>
            );
          })}
        </g>
      )}
      {over?.(P)}
      <g fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#0b2d40" fillOpacity="0.5">
        {lons.map((lon) => (
          <text key={lon} x={P.project([lon, 0])[0] + 4} y={14}>
            {ew(lon)}
          </text>
        ))}
        {lats.map((lat) => (
          <text key={lat} x={4} y={P.project([0, lat])[1] - 4}>
            {ns(lat)}
          </text>
        ))}
      </g>
      <g transform={`translate(16 ${P.height - 26})`}>
        <rect x="-6" y="-8" width={barW + 12} height="26" fill="#f7f4ee" fillOpacity="0.9" />
        <path d={`M0 0 V6 H${barW} V0`} fill="none" stroke="#12222d" strokeWidth="1.2" />
        <text x="2" y="15" fontFamily="IBM Plex Mono, monospace" fontSize="10.5" fill="#12222d">
          {scaleKm} km
        </text>
      </g>
    </svg>
  );
}

/** Pick a scale-bar length that fits the map width. */
export function niceScaleKm(bounds: Bounds) {
  const midLat = (bounds.north + bounds.south) / 2;
  const widthKm = (bounds.east - bounds.west) * 111.32 * Math.cos((midLat * Math.PI) / 180);
  return [1, 2, 5, 10, 20, 50, 100, 200].reduce((best, k) => (k <= widthKm / 5 ? k : best), 1);
}

/** Pick a graticule step that gives a handful of lines. */
export function niceGraticule(bounds: Bounds) {
  const span = bounds.east - bounds.west;
  return [0.05, 0.1, 0.25, 0.5, 1, 2].find((g) => span / g <= 8) ?? 2;
}
