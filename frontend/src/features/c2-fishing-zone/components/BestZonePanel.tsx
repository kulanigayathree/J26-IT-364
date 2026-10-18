import { Badge, Card, StatTile } from '@/components/ui';
import { formatDateTime, formatLatLon, formatPercent } from '@/lib/format';
import type { BestZone } from '../types';
import { confidenceWords, directionWords } from './plainWords';

export function BestZonePanel({ zone, modelVersion }: { zone: BestZone; modelVersion: string }) {
  const confidence = confidenceWords[zone.confidence];
  return (
    <Card
      title="Best zone"
      description={`From ${zone.port_name}, valid until ${formatDateTime(zone.valid_to)}`}
      headingLevel={3}
    >
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          className="col-span-2"
          label="Location"
          value={formatLatLon(zone.lat, zone.lon)}
          emphasis
          note={`${zone.distance_km.toFixed(0)} km ${directionWords(zone.direction)} of ${zone.port_name}`}
        />
        <StatTile label="Distance from port" value={zone.distance_km.toFixed(0)} unit="km" />
        <StatTile
          label="Fuel estimate"
          value={zone.fuel_litres}
          unit="L"
          source={`round trip, ${zone.fuel_rate_l_per_km} L/km`}
        />
        <StatTile label="Catch probability" value={formatPercent(zone.probability)} />
        <StatTile
          label="Confidence"
          value={<Badge tone={confidence.tone}>{confidence.short}</Badge>}
          note={`± ${formatPercent(zone.uncertainty)}`}
        />
      </div>
      <p className="mt-3 text-xs text-muted">
        Ranked by expected catch minus fuel cost. Model: {modelVersion}.
      </p>
    </Card>
  );
}
