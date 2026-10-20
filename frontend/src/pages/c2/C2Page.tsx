import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, Rectangle, Tooltip } from 'react-leaflet';
import { getC2Data, getC2Forecast, getC2Zones } from '../../api/c2';
import { useApi } from '../../api/client';
import { ComponentPage, StatRow } from '../../components/ComponentPage';
import { DataTable } from '../../components/DataTable';
import { EmptyState } from '../../components/EmptyState';
import { ErrorMessage } from '../../components/ErrorMessage';
import { inputClass } from '../../components/FormField';
import { Loading } from '../../components/Loading';
import { MapLegend } from '../../components/MapLegend';
import { MapView } from '../../components/MapView';
import { StatCard } from '../../components/StatCard';
import { formatDate, formatNumber, percent } from '../../format';
import { colors } from '../../theme';
import type { C2Data, C2Forecast, Zone } from '../../types/c2';

type View = 'probability' | 'uncertainty';

// Colour steps for the grid. Same steps are shown in the legend.
const STEPS: Record<View, { limits: number[]; color: string; labels: string[]; swatches: string[] }> = {
  probability: {
    limits: [0.2, 0.4, 0.6],
    color: colors.coral,
    labels: ['Under 20%', '20–40%', '40–60%', 'Over 60%'],
    swatches: ['border-coral bg-coral/10', 'border-coral bg-coral/25', 'border-coral bg-coral/45', 'border-coral bg-coral/70'],
  },
  uncertainty: {
    limits: [0.1, 0.2, 0.3],
    color: colors.sea,
    labels: ['± under 10%', '± 10–20%', '± 20–30%', '± over 30%'],
    swatches: ['border-sea bg-sea/10', 'border-sea bg-sea/25', 'border-sea bg-sea/45', 'border-sea bg-sea/70'],
  },
};
const OPACITY = [0.1, 0.25, 0.45, 0.7];

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

function ChoiceButtons<V extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-bold">{label}</legend>
      <div className="grid auto-cols-fr grid-flow-col overflow-hidden rounded border border-navy">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
            className={`h-12 border-r border-navy px-2 font-bold last:border-r-0 ${o.value === value ? 'bg-navy text-paper' : 'bg-paper text-navy hover:bg-paper-2'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function GridLayer({ forecast, view }: { forecast: C2Forecast; view: View }) {
  const cells = useMemo(() => {
    const { limits, color } = STEPS[view];
    const values = forecast[view];
    const half = forecast.cell_size / 2;
    const out = [];
    for (let i = 0; i < forecast.lat.length; i++) {
      for (let j = 0; j < forecast.lon.length; j++) {
        const v = values[i]?.[j];
        if (v === null || v === undefined) continue;
        const step = limits.filter((l) => v >= l).length;
        const lat = forecast.lat[i];
        const lon = forecast.lon[j];
        out.push(
          <Rectangle
            key={`${i}-${j}`}
            bounds={[
              [lat - half, lon - half],
              [lat + half, lon + half],
            ]}
            interactive={false}
            pathOptions={{ stroke: false, fillColor: color, fillOpacity: OPACITY[step] }}
          />,
        );
      }
    }
    return out;
  }, [forecast, view]);
  return <>{cells}</>;
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

  return (
    <>
      <StatRow>
        <StatCard label="Best zone" value={best ? `${percent(best.probability)} likely` : '—'} note={`from ${port}`} />
        <StatCard label="Return trip" value={best ? `${formatNumber(best.distance_km)} km` : '—'} />
        <StatCard label="Fuel cost" value={best ? `Rs ${formatNumber(best.fuel_cost_rs)}` : '—'} note={best ? `${formatNumber(best.fuel_litres)} L` : undefined} />
        <StatCard label="Forecast for" value={formatDate(data.leads.find((l) => l.lead === lead)?.date ?? data.issued_date)} note={`issued ${formatDate(data.issued_date)}`} />
      </StatRow>

      <section className="flex flex-col gap-4 rounded border border-line bg-paper-2 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <ChoiceButtons
            label="Day"
            value={lead}
            onChange={setLead}
            options={data.leads.map((l) => ({ value: l.lead, label: `Day ${l.lead}` }))}
          />
          <ChoiceButtons
            label="Show on map"
            value={view}
            onChange={setView}
            options={[
              { value: 'probability', label: 'Probability' },
              { value: 'uncertainty', label: 'Uncertainty' },
            ]}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm font-bold">
            Port
            <select value={port} onChange={(e) => setPort(e.target.value)} className={`${inputClass} h-12 font-normal`}>
              {data.ports.map((p) => (
                <option key={p.name}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Boat fuel use (L/km)
            <input type="number" inputMode="decimal" min="0.1" step="0.1" value={fuelUse} onChange={(e) => setFuelUse(e.target.value)} className={`${inputClass} h-12 font-normal`} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Fuel price (Rs/L)
            <input type="number" inputMode="decimal" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} className={`${inputClass} h-12 font-normal`} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Max return trip
            <select value={maxKm} onChange={(e) => setMaxKm(e.target.value)} className={`${inputClass} h-12 font-normal`}>
              {DISTANCES.map((d) => (
                <option key={d.label} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section>
        {forecast.error ? (
          <ErrorMessage message={forecast.error} onRetry={forecast.reload} />
        ) : !forecast.data ? (
          <Loading text="Loading forecast map…" />
        ) : (
          <>
            <MapView label="Map of fishing probability" height="lg">
              <GridLayer forecast={forecast.data} view={view} />
              {portInfo && (
                <CircleMarker center={[portInfo.lat, portInfo.lon]} radius={7} pathOptions={{ color: colors.navy, fillColor: colors.paper, fillOpacity: 1, weight: 3 }}>
                  <Tooltip>Port: {portInfo.name}</Tooltip>
                </CircleMarker>
              )}
              {zones.data?.zones.map((z) => (
                <CircleMarker key={z.rank} center={[z.lat, z.lon]} radius={z.rank === 1 ? 9 : 6} pathOptions={{ color: colors.navy, fillColor: colors.navy, fillOpacity: 0.85, weight: 2 }}>
                  <Tooltip>
                    #{z.rank} · {percent(z.probability)} likely · {formatNumber(z.distance_km)} km return
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapView>
            <MapLegend
              items={[
                ...STEPS[view].labels.map((label, i) => ({ label, swatch: STEPS[view].swatches[i] })),
                { label: 'Top 10 zones', swatch: 'border-navy bg-navy' },
                { label: 'Port', swatch: 'border-navy bg-paper' },
              ]}
            />
          </>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-xl">Top 10 zones from {port}</h2>
        <p className="mb-3 text-sm text-muted">Distance is the return trip. Fuel = distance × boat fuel use.</p>
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
            columns={[
              { header: 'Rank', cell: (z) => `#${z.rank}` },
              { header: 'Lat', cell: (z) => `${z.lat.toFixed(3)}° N`, numeric: true },
              { header: 'Lon', cell: (z) => `${z.lon.toFixed(3)}° E`, numeric: true },
              { header: 'Probability', cell: (z) => percent(z.probability), numeric: true },
              { header: 'Uncertainty', cell: (z) => `± ${percent(z.uncertainty)}`, numeric: true },
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
    <ComponentPage
      code="C2"
      title="Fishing-Zone Prediction"
      description="Chance of a good catch for the next 3 days, with uncertainty. Pick your port and boat to see the best zones, distance and fuel."
      state={state}
      isEmpty={(d) => d.leads.length === 0}
      emptyMessage="No forecast yet. The C2 model has not exported a forecast."
      disclaimer="Model output – not field-confirmed. Check the weather and official advisories before going to sea."
    >
      {(data) => <Planner data={data} />}
    </ComponentPage>
  );
}
