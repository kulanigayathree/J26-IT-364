import type { Feature, Point } from 'geojson';
import { DataTable, SeverityBadge, type Column } from '@/components/ui';
import { formatDateTime, formatPosition } from '@/lib/format';
import type { AnomalyProperties } from '../types';
import { anomalyLabel } from './labels';

type AnomalyFeature = Feature<Point, AnomalyProperties>;

const columns: Column<AnomalyFeature>[] = [
  {
    key: 'vessel',
    header: 'Vessel',
    cell: (f) => f.properties.vessel_name,
    sortValue: (f) => f.properties.vessel_name,
  },
  {
    key: 'score',
    header: 'Score',
    align: 'right',
    cell: (f) => f.properties.score.toFixed(2),
    sortValue: (f) => f.properties.score,
  },
  {
    key: 'severity',
    header: 'Severity',
    cell: (f) => <SeverityBadge level={f.properties.severity} />,
    sortValue: (f) => ({ low: 0, medium: 1, high: 2 })[f.properties.severity],
  },
  {
    key: 'type',
    header: 'Type',
    cell: (f) => `${anomalyLabel[f.properties.anomaly_type]} (${f.properties.source})`,
    sortValue: (f) => f.properties.anomaly_type,
  },
  {
    key: 'location',
    header: 'Location',
    cell: (f) => formatPosition(f.geometry.coordinates),
  },
  {
    key: 'time',
    header: 'Detected',
    cell: (f) => formatDateTime(f.properties.detected_at),
    sortValue: (f) => f.properties.detected_at,
  },
  {
    key: 'mmsi',
    header: 'MMSI',
    hideOnMobile: true,
    cell: (f) => f.properties.mmsi,
  },
];

export interface AnomalyTableProps {
  rows: AnomalyFeature[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function AnomalyTable({ rows, selectedId, onSelect }: AnomalyTableProps) {
  return (
    <DataTable
      caption="Vessel anomaly alerts"
      columns={columns}
      rows={rows}
      getRowId={(f) => f.properties.id}
      selectedId={selectedId}
      onRowClick={(f) => onSelect(f.properties.id)}
      initialSort={{ key: 'score', direction: 'desc' }}
    />
  );
}
