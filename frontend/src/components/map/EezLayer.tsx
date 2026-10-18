import type { FeatureCollection } from 'geojson';
import eez from '@/assets/geo/sl-eez-approx.json';
import { mapStyles } from '@/design/mapStyles';
import { GeoJSONLayer } from './GeoJSONLayer';

const eezData = eez as unknown as FeatureCollection;

/** Shared EEZ outline. MapView draws it by default; add `eezLegendItem` to the map legend. */
export function EezLayer() {
  return <GeoJSONLayer data={eezData} layerStyle={mapStyles.boundary} interactive={false} />;
}
