import { useEffect, useState } from 'react';
import { getC2Data, getC2Forecast, getC2Zones } from '../../api/c2';
import { useApi } from '../../api/client';
import { DataTable } from '../../components/DataTable';
import { ModelPage } from '../../components/ModelPage';
import { SeaMap } from '../../components/SeaMap';
import { EmptyState, ErrorMessage, Field, Loading, SectionTitle, Segmented, StatRow, inputCls } from '../../components/ui';
import { formatDate, formatNumber, percent } from '../../format';
import type { C2Data, Zone } from '../../types/c2';
import { GridCells, STEPS, Swatch, gridBounds, type View } from './grid';
import { ReplayPanel } from './ReplayPanel';

const DISTANCES = [
  { value: '150', label: 'Up to 150 km' },
  { value: '300', label: 'Up to 300 km' },
  { value: '500', label: 'Up to 500 km' },
  { value: '', label: 'Any distance' },
];

/** Wait until the user stops typing before calling the API. */
function useDebounced<T>(value: T, ms = 400): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function Planner({ data }: { data: C2Data }) {
  const [lead, setLead] = useState(data.leads[0]?.lead ?? 1);
  const [view, setView] = useState<View>('probability');
  const [port, setPort] = useState(data.ports[0]?.name ?? 'Colombo');
  const [fuelUse, setFuelUse] = useState('2.5');
  const [price, setPrice] = useState('300');
  const [maxKm, setMaxKm] = useState('300');

  const fuel = useDebounced(Number(fuelUse) > 0 ? Number(fuelUse) : 2.5);
  const fuelPrice = useDebounced(Number(price) >= 0 ? Number(price) : 300);

  const forecast = useApi(() => getC2Forecast(lead), [lead]);
  const zones = useApi(
    () => getC2Zones({ lead, port, fuel_l_per_km: fuel, fuel_price: fuelPrice, max_km: maxKm ? Number(maxKm) : undefined }),
    [lead, port, fuel, fuelPrice, maxKm],
  );

  const portInfo = data.ports.find((p) => p.name === port);
  const best = zones.data?.zones[0];
  const f = forecast.data;

  return (
    <>
      <StatRow
        items={[
          { label: 'Best zone', value: best ? `${percent(best.probability)} likely` : '—', note: `from ${port}` },
          { label: 'Return trip', value: best ? `${formatNumber(best.distance_km)} km` : '—' },
          { label: 'Fuel cost', value: best ? `Rs ${formatNumber(best.fuel_cost_rs)}` : '—', note: best ? `${formatNumber(best.fuel_litres)} L` : undefined },
          {
            label: 'Forecast for',
            value: formatDate(data.leads.find((l) => l.lead === lead)?.date ?? data.issued_date),
            note: `issued ${formatDate(data.issued_date)}`,
          },
        ]}
      />

      <section className="rounded-[4px] border border-line bg-sand/40 p-5">
        <div className="grid gap-5 md:grid-cols-2">
          <Segmented label="Day" value={lead} onChange={setLead} options={data.leads.map((l) => ({ value: l.lead, label: `Day ${l.lead}` }))} />
          <Segmented
            label="Show on map"
            value={view}
            onChange={setView}
            options={[
              { value: 'probability', label: 'Probability' },
              { value: 'uncertainty', label: 'Uncertainty' },
            ]}
          />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Port">
            <select value={port} onChange={(e) => setPort(e.target.value)} className={inputCls}>
              {data.ports.map((p) => (
                <option key={p.name}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Boat fuel use (L/km)">
            <input type="number" inputMode="decimal" min="0.1" step="0.1" value={fuelUse} onChange={(e) => setFuelUse(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Fuel price (Rs/L)">
            <input type="number" inputMode="decimal" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Max return trip">
            <select value={maxKm} onChange={(e) => setMaxKm(e.target.value)} className={inputCls}>
              {DISTANCES.map((d) => (
                <option key={d.label} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <figure>
        {forecast.error ? (
          <ErrorMessage message={forecast.error} onRetry={forecast.reload} />
        ) : !f ? (
          <Loading text="Loading forecast map…" />
        ) : (
          <>
            <div className="overflow-hidden rounded-[4px] border border-line">
              <SeaMap
                bounds={gridBounds(f.lat, f.lon, f.cell_size)}
                label={`Map of predicted fishing ${view} for ${formatDate(f.date)}`}
                under={(P) => (
                  <GridCells P={P} lat={f.lat} lon={f.lon} cellSize={f.cell_size} values={f[view]} fills={STEPS[view].fills} limits={STEPS[view].limits} />
                )}
                over={(P) => (
                  <g>
                    {zones.data?.zones.map((z) => {
                      const [x, y] = P.project([z.lon, z.lat]);
                      return (
                        <g key={z.rank}>
                          <title>{`#${z.rank} · ${percent(z.probability)} likely · ${formatNumber(z.distance_km)} km return`}</title>
                          <circle cx={x} cy={y} r={z.rank <= 3 ? 9 : 7} fill="#0b2d40" stroke="#fff" strokeWidth="1.2" />
                          {z.rank <= 3 && (
                            <text x={x} y={y + 3.5} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#fff">
                              {z.rank}
                            </text>
                          )}
                        </g>
                      );
                    })}
                    {portInfo &&
                      (() => {
                        const [px, py] = P.project([portInfo.lon, portInfo.lat]);
                        return (
                          <circle cx={px} cy={py} r="8" fill="#fff" stroke="#0b2d40" strokeWidth="3">
                            <title>{`Port: ${portInfo.name}`}</title>
                          </circle>
                        );
                      })()}
                  </g>
                )}
              />
            </div>
            <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-muted">
              {STEPS[view].labels.map((label, i) => (
                <Swatch key={label} swatch={STEPS[view].swatches[i]} label={label} />
              ))}
              <span className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-deep" />
                Top 10 zones
              </span>
              <span className="flex items-center gap-2">
                <span className="size-3 rounded-full border-2 border-deep bg-white" />
                Port
              </span>
            </figcaption>
          </>
        )}
      </figure>

      <section>
        <SectionTitle>Top 10 zones from {port}</SectionTitle>
        <p className="-mt-1 mb-3 text-[13.5px] text-muted">Distance is the return trip. Fuel = distance × boat fuel use.</p>
        {zones.error ? (
          <ErrorMessage message={zones.error} onRetry={zones.reload} />
        ) : !zones.data ? (
          <Loading text="Ranking zones…" />
        ) : zones.data.zones.length === 0 ? (
          <EmptyState message="No zones within this distance. Choose a longer trip." />
        ) : (
          <DataTable<Zone>
            caption="Top 10 fishing zones"
            rows={zones.data.zones}
            rowKey={(z) => String(z.rank)}
            minWidth="min-w-[820px]"
            columns={[
              { header: 'Rank', cell: (z) => `#${z.rank}`, mono: true },
              { header: 'Lat', cell: (z) => `${z.lat.toFixed(3)}° N`, numeric: true, mono: true },
              { header: 'Lon', cell: (z) => `${z.lon.toFixed(3)}° E`, numeric: true, mono: true },
              { header: 'Probability', cell: (z) => <span className="font-medium">{percent(z.probability)}</span>, numeric: true },
              { header: 'Uncertainty', cell: (z) => <span className="text-muted">± {percent(z.uncertainty)}</span>, numeric: true },
              { header: 'Distance', cell: (z) => `${formatNumber(z.distance_km)} km`, numeric: true },
              { header: 'Fuel', cell: (z) => `${formatNumber(z.fuel_litres)} L`, numeric: true },
              { header: 'Cost', cell: (z) => `Rs ${formatNumber(z.fuel_cost_rs)}`, numeric: true },
            ]}
          />
        )}
      </section>
    </>
  );
}

export default function C2Page() {
  const state = useApi(getC2Data, []);
  return (
    <ModelPage id="c2" state={state} isEmpty={(d) => d.leads.length === 0} emptyMessage="No forecast yet. The C2 model has not exported a forecast.">
      {(data) => (
        <>
          <Planner data={data} />
          <ReplayPanel />
        </>
      )}
    </ModelPage>
  );
}
