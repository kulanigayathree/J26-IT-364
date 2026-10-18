import type { LatLngTuple } from 'leaflet';
import type { LegendItem } from '@/components/ui';

/** Centre of Sri Lanka and its waters. */
export const SRI_LANKA_CENTER: LatLngTuple = [7.9, 80.7];
export const SRI_LANKA_ZOOM = 7;

/** Legend entry to add to any MapLegend that shows the EEZ. */
export const eezLegendItem: LegendItem = {
  // TODO: drop "approximate" once the Marine Regions boundary replaces the placeholder.
  label: 'EEZ (approximate)',
  color: 'sea',
  shape: 'dashed',
};
