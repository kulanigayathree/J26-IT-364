import { EEZ, SHELF, SRI_LANKA, makeProjector } from '../../data/geo';

const P = makeProjector({ west: 76.5, east: 85.7, south: 1.8, north: 11.4 }, 300);

export function StudyAreaInset() {
  const lons = [78, 80, 82, 84];
  const lats = [3, 5, 7, 9, 11];
  return (
    <figure className="rounded-[4px] border border-paper/15 bg-abyss p-4 shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
      <figcaption className="flex items-baseline justify-between">
        <span className="font-display text-[17px]">Study area</span>
        <span className="font-mono text-[11px] text-paper/55">2°N–11°N · 77°E–85°E</span>
      </figcaption>
      <svg viewBox={`0 0 ${P.width} ${P.height}`} className="mt-3 block w-full" role="img" aria-label="Map of Sri Lanka with its approximate Exclusive Economic Zone">
        {lons.map((lon) => {
          const [x] = P.project([lon, 0]);
          return <line key={lon} x1={x} x2={x} y1={0} y2={P.height} stroke="#f7f4ee" strokeOpacity="0.07" />;
        })}
        {lats.map((lat) => {
          const [, y] = P.project([0, lat]);
          return <line key={lat} x1={0} x2={P.width} y1={y} y2={y} stroke="#f7f4ee" strokeOpacity="0.07" />;
        })}
        <path d={P.path(EEZ)} fill="#1d7f7e" fillOpacity="0.12" stroke="#8cc9c1" strokeOpacity="0.7" strokeWidth="1" strokeDasharray="4 3" />
        <path d={P.path(SHELF)} fill="#1d7f7e" fillOpacity="0.22" stroke="none" />
        <path d={P.path(SRI_LANKA)} fill="#ece6da" stroke="#ece6da" strokeWidth="0.6" strokeLinejoin="round" />
      </svg>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-paper/10 pt-3 text-[12px] text-paper/70">
        <span className="flex items-center gap-2">
          <span className="h-0 w-4 border-t border-dashed border-shallow" /> EEZ (approx.)
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-4 bg-tide/50" /> Continental shelf
        </span>
      </div>
    </figure>
  );
}
