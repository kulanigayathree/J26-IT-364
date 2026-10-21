import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Fish, Shell, Ship } from 'lucide-react';
import { EEZ, INDIA, PORTS, REEF_SITES, SHELF, SRI_LANKA, makeProjector, type LonLat } from '../../data/geo';
import { CELL, FISHING_CELLS, SPILL, SPILL_DRIFT, VESSEL_TRACKS, suitabilityColor } from '../../data/layers';

type LayerId = 'fishing' | 'vessels' | 'reefs' | 'spill';

const RAMP = Array.from({ length: 20 }, (_, i) => suitabilityColor(i / 19));

const LAYERS: { id: LayerId; label: string; description: string; icon: typeof Fish; legend?: ReactNode }[] = [
  {
    id: 'fishing',
    label: 'Fishing suitability',
    description: 'Predicted suitability on a 0.4° grid, from temperature, chlorophyll and depth.',
    icon: Fish,
    legend: (
      <div>
        <svg viewBox="0 0 200 8" preserveAspectRatio="none" className="block h-2 w-full overflow-hidden rounded-[2px]" aria-hidden>
          {RAMP.map((c, i) => (
            <rect key={i} x={i * 10} y={0} width={10.5} height={8} fill={c} />
          ))}
        </svg>
        <div className="mt-1.5 flex justify-between font-mono text-[11px] text-muted">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
    ),
  },
  {
    id: 'vessels',
    label: 'Vessel tracks',
    description: 'Reconstructed AIS tracks. A loitering pattern near the EEZ edge is marked for review.',
    icon: Ship,
    legend: (
      <div className="space-y-1.5 text-[12.5px] text-muted">
        <span className="flex items-center gap-2">
          <span className="h-0 w-5 border-t-[1.5px] border-deep/50" /> Routine track
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0 w-5 border-t-2 border-coral" /> Flagged for review
        </span>
      </div>
    ),
  },
  { id: 'reefs', label: 'Reef sites', description: 'Known coral reef areas where satellite imagery is used to track condition over time.', icon: Shell },
  { id: 'spill', label: 'Oil spill candidate', description: 'A candidate slick in the southern shipping lane, with its estimated drift direction.', icon: Droplets },
];

export function OceanMap() {
  const [on, setOn] = useState<Record<LayerId, boolean>>({ fishing: true, vessels: true, reefs: true, spill: false });
  const [focus, setFocus] = useState<LayerId>('fishing');
  const toggle = (id: LayerId) => {
    setOn((s) => ({ ...s, [id]: !s[id] }));
    setFocus(id);
  };
  const current = LAYERS.find((l) => l.id === focus)!;

  return (
    <section id="monitoring" className="scroll-mt-20 border-y border-line bg-sand/60">
      <div className="mx-auto max-w-page px-5 py-20 md:px-8 md:py-24">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <h2 className="font-display text-[34px] leading-[1.1] tracking-[-0.01em] text-deep md:text-[44px] lg:col-span-7">
            One map for the waters around Sri Lanka
          </h2>
          <p className="max-w-[440px] text-[16px] leading-[1.7] text-muted lg:col-span-5">
            Each research component contributes a layer. Viewed together they show how fishing grounds, shipping routes and
            sensitive reefs overlap within the Exclusive Economic Zone.
          </p>
        </div>

        <div className="mt-10 grid overflow-hidden rounded-[4px] border border-line bg-paper lg:grid-cols-[300px_1fr]">
          <aside className="flex flex-col border-b border-line lg:border-b-0 lg:border-r">
            <div className="px-5 pb-3 pt-5">
              <p className="font-display text-[19px] text-deep">Layers</p>
            </div>
            <ul className="border-t border-line">
              {LAYERS.map((l) => {
                const Icon = l.icon;
                const active = on[l.id];
                return (
                  <li key={l.id} className="border-b border-line">
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggle(l.id)}
                      className={`flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors duration-150 hover:bg-sand/70 ${focus === l.id ? 'bg-sand/50' : ''}`}
                    >
                      <Icon className={`size-[18px] shrink-0 ${active ? 'text-tide' : 'text-muted/60'}`} strokeWidth={1.5} />
                      <span className={`flex-1 whitespace-nowrap text-[14.5px] ${active ? 'text-ink' : 'text-muted'}`}>{l.label}</span>
                      <span className={`relative h-[18px] w-8 shrink-0 rounded-full border transition-colors duration-150 ${active ? 'border-tide bg-tide' : 'border-line bg-sand'}`}>
                        <span className={`absolute left-[2px] top-[2px] size-3 rounded-full bg-paper transition-transform duration-150 ease-soft ${active ? 'translate-x-[14px]' : ''}`} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="px-5 py-5">
              <p className="font-mono text-[11.5px] text-tide">{current.label}</p>
              <p className="mt-2 text-[14px] leading-[1.65] text-muted">{current.description}</p>
              {current.legend && <div className="mt-4">{current.legend}</div>}
            </div>
            <p className="mt-auto border-t border-line px-5 py-4 text-[12px] leading-[1.55] text-muted">
              Sample layers shown for illustration. Boundaries are approximate and not for navigation. Log in to see the models’ real
              outputs.
            </p>
          </aside>

          <MapCanvas on={on} />
        </div>
      </div>
    </section>
  );
}

const P = makeProjector({ west: 74, east: 88, south: 1.8, north: 11.4 }, 1000);
const fade = { duration: 0.2, ease: [0.23, 1, 0.32, 1] as const };
const REEF_LABELS: Record<string, { dx: number; dy: number; anchor: 'start' | 'end' }> = {
  'Bar Reef': { dx: -9, dy: 4, anchor: 'end' },
  'Pigeon Island': { dx: 9, dy: -3, anchor: 'start' },
  Kayankerni: { dx: 9, dy: 4, anchor: 'start' },
  Hikkaduwa: { dx: -9, dy: 0, anchor: 'end' },
  Rumassala: { dx: -7, dy: 13, anchor: 'end' },
};
const PORT_LABELS: Record<string, { dx: number; dy: number; anchor: 'start' | 'end' } | null> = {
  Colombo: { dx: -9, dy: 4, anchor: 'end' },
  Galle: null,
  Hambantota: { dx: 6, dy: 15, anchor: 'start' },
  Trincomalee: { dx: 9, dy: 10, anchor: 'start' },
  Kankesanthurai: { dx: 8, dy: -6, anchor: 'start' },
};

function MapCanvas({ on }: { on: Record<LayerId, boolean> }) {
  const lons = [76, 78, 80, 82, 84, 86];
  const lats = [3, 5, 7, 9, 11];
  const km200 = 200 / 110.4;
  const pt = (p: LonLat) => P.project(p);

  return (
    <div className="relative bg-deep">
      <svg
        viewBox={`0 0 ${P.width} ${P.height}`}
        className="block h-auto w-full"
        role="img"
        aria-label="Map of the waters around Sri Lanka showing the Exclusive Economic Zone, continental shelf and selected monitoring layers"
      >
        <rect width={P.width} height={P.height} fill="#0b2d40" />
        <g stroke="#f7f4ee" strokeOpacity="0.08">
          {lons.map((lon) => (
            <line key={lon} x1={pt([lon, 0])[0]} x2={pt([lon, 0])[0]} y1={0} y2={P.height} />
          ))}
          {lats.map((lat) => (
            <line key={lat} x1={0} x2={P.width} y1={pt([0, lat])[1]} y2={pt([0, lat])[1]} />
          ))}
        </g>
        <g fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#f7f4ee" fillOpacity="0.45">
          {lons.map((lon) => (
            <text key={lon} x={pt([lon, 0])[0] + 4} y={P.height - 8}>
              {lon}°E
            </text>
          ))}
          {lats.map((lat) => (
            <text key={lat} x={6} y={pt([0, lat])[1] - 5}>
              {lat}°N
            </text>
          ))}
        </g>

        <path d={P.path(EEZ)} fill="#1d7f7e" fillOpacity="0.1" />
        <path d={P.path(SHELF)} fill="#1d7f7e" fillOpacity="0.3" />

        <motion.g initial={false} animate={{ opacity: on.fishing ? 0.82 : 0 }} transition={fade}>
          {FISHING_CELLS.map((c) => {
            const [x, y] = pt([c.lon, c.lat + CELL]);
            return <rect key={`${c.lon}-${c.lat}`} x={x} y={y} width={CELL * P.scale + 0.4} height={CELL * P.scale + 0.4} fill={suitabilityColor(c.v)} />;
          })}
        </motion.g>

        <path d={P.path(EEZ)} fill="none" stroke="#8cc9c1" strokeWidth="1.2" strokeDasharray="6 4" />

        <g fontFamily="Newsreader, Georgia, serif" fontStyle="italic" fill="#f7f4ee" fillOpacity="0.55">
          <text x={pt([79.6, 3.0])[0]} y={pt([79.6, 3.0])[1]} fontSize="22">Indian Ocean</text>
          <text x={pt([85.6, 10.6])[0]} y={pt([85.6, 10.6])[1]} fontSize="17">Bay of Bengal</text>
          <text x={pt([74.6, 6.4])[0]} y={pt([74.6, 6.4])[1]} fontSize="17">Laccadive Sea</text>
          <text x={pt([77.9, 7.75])[0]} y={pt([77.9, 7.75])[1]} fontSize="13">Gulf of Mannar</text>
        </g>
        <text
          x={pt([84.55, 7.4])[0]}
          y={pt([84.55, 7.4])[1]}
          fontFamily="IBM Plex Mono, monospace"
          fontSize="10.5"
          fill="#8cc9c1"
          transform={`rotate(84 ${pt([84.55, 7.4])[0]} ${pt([84.55, 7.4])[1]})`}
        >
          EEZ (approx.)
        </text>

        <motion.g initial={false} animate={{ opacity: on.vessels ? 1 : 0 }} transition={fade}>
          {VESSEL_TRACKS.filter((t) => !t.flagged).map((t) => (
            <path key={t.id} d={P.path(t.pts, false)} fill="none" stroke="#f7f4ee" strokeOpacity="0.55" strokeWidth="1.2" strokeLinejoin="round" />
          ))}
          {VESSEL_TRACKS.filter((t) => t.flagged).map((t) => {
            const [sx, sy] = pt(t.pts[0]);
            const [ex, ey] = pt(t.pts[t.pts.length - 1]);
            return (
              <g key={t.id}>
                <path d={P.path(t.pts, false)} fill="none" stroke="#d0603f" strokeWidth="2" strokeLinejoin="round" />
                <rect x={ex - 3.5} y={ey - 3.5} width="7" height="7" fill="#d0603f" />
                <text x={sx + 10} y={sy + 16} fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#f0c9b8">
                  Loitering pattern · for review
                </text>
              </g>
            );
          })}
        </motion.g>

        <motion.g initial={false} animate={{ opacity: on.spill ? 1 : 0 }} transition={fade}>
          <path d={P.path(SPILL)} fill="#061a26" fillOpacity="0.9" stroke="#d0603f" strokeWidth="1.2" />
          <line
            x1={pt(SPILL_DRIFT[0])[0]}
            y1={pt(SPILL_DRIFT[0])[1]}
            x2={pt(SPILL_DRIFT[1])[0]}
            y2={pt(SPILL_DRIFT[1])[1]}
            stroke="#f0c9b8"
            strokeWidth="1.4"
            strokeDasharray="3 3"
            markerEnd="url(#arrow)"
          />
          <text x={pt([81.42, 6.0])[0] + 6} y={pt([81.42, 6.0])[1] - 6} fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#f0c9b8">
            Estimated drift
          </text>
        </motion.g>

        <path d={P.path(INDIA)} fill="#c9c0ae" stroke="#0b2d40" strokeWidth="0.8" />
        <text x={pt([76.3, 10.4])[0]} y={pt([76.3, 10.4])[1]} fontFamily="IBM Plex Sans, sans-serif" fontSize="12" fill="#56656f" letterSpacing="2">
          INDIA
        </text>
        <path d={P.path(SRI_LANKA)} fill="#ece6da" stroke="#0b2d40" strokeWidth="0.8" strokeLinejoin="round" />
        <text x={pt([80.35, 7.55])[0]} y={pt([80.35, 7.55])[1]} fontFamily="Newsreader, Georgia, serif" fontSize="15" fill="#12222d">
          Sri Lanka
        </text>

        <g fontFamily="IBM Plex Sans, sans-serif" fontSize="11.5" fill="#f7f4ee">
          {PORTS.map((p) => {
            const [x, y] = pt(p.at);
            const l = PORT_LABELS[p.name];
            return (
              <g key={p.name}>
                <rect x={x - 2.5} y={y - 2.5} width="5" height="5" fill="#12222d" stroke="#ece6da" strokeWidth="1" />
                {l && (
                  <text x={x + l.dx} y={y + l.dy} textAnchor={l.anchor} fillOpacity="0.85">
                    {p.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        <motion.g initial={false} animate={{ opacity: on.reefs ? 1 : 0 }} transition={fade}>
          {REEF_SITES.map((r) => {
            const [x, y] = pt(r.at);
            const l = REEF_LABELS[r.name];
            return (
              <g key={r.name}>
                <path d={`M${x} ${y - 5} L${x + 5} ${y} L${x} ${y + 5} L${x - 5} ${y} Z`} fill="#8cc9c1" stroke="#061a26" strokeWidth="1" />
                <text x={x + l.dx} y={y + l.dy} textAnchor={l.anchor} fontFamily="IBM Plex Sans, sans-serif" fontSize="11.5" fill="#8cc9c1">
                  {r.name}
                </text>
              </g>
            );
          })}
        </motion.g>

        <g transform={`translate(${P.width - 200} ${P.height - 46})`} fontFamily="IBM Plex Mono, monospace" fontSize="10.5" fill="#f7f4ee" fillOpacity="0.7">
          <rect x="0" y="0" width={(km200 * P.scale) / 2} height="4" fill="#f7f4ee" fillOpacity="0.8" />
          <rect x={(km200 * P.scale) / 2} y="0" width={(km200 * P.scale) / 2} height="4" fill="none" stroke="#f7f4ee" strokeOpacity="0.8" />
          <text x="0" y="18">0</text>
          <text x={km200 * P.scale} y="18" textAnchor="end">
            200 km
          </text>
        </g>
        <g transform={`translate(${P.width - 34} ${40})`} fill="#f7f4ee" fillOpacity="0.75">
          <path d="M0 -14 L6 6 L0 2 L-6 6 Z" />
          <text y="22" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="11">
            N
          </text>
        </g>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 Z" fill="#f0c9b8" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
