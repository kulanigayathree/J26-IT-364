import { SRI_LANKA, makeProjector } from '../../data/geo';
import { CELL, FISHING_CELLS, suitabilityColor } from '../../data/layers';

// Cropped to the waters immediately around the island, 4:3.
const BOUNDS = { west: 77.6, east: 84.0, south: 3.6, north: 8.8 };
const P = makeProjector(BOUNDS, 480);

export function FishingPreview() {
  return (
    <svg
      viewBox={`0 0 ${P.width} ${P.width * 0.75}`}
      preserveAspectRatio="xMidYMid slice"
      className="block h-full w-full"
      role="img"
      aria-label="Illustrative map of predicted fishing suitability around southern Sri Lanka"
    >
      <rect width="100%" height="100%" fill="#0b2d40" />
      {FISHING_CELLS.map((c) => {
        const [x, y] = P.project([c.lon, c.lat + CELL]);
        return <rect key={`${c.lon}-${c.lat}`} x={x} y={y} width={CELL * P.scale + 0.5} height={CELL * P.scale + 0.5} fill={suitabilityColor(c.v)} opacity={0.9} />;
      })}
      <path d={P.path(SRI_LANKA)} fill="#ece6da" stroke="#0b2d40" strokeWidth="1" />
      <g fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#f7f4ee">
        <rect x="14" y={P.width * 0.75 - 40} width="150" height="26" fill="#061a26" />
        <text x="24" y={P.width * 0.75 - 23}>
          Illustrative output
        </text>
      </g>
    </svg>
  );
}
