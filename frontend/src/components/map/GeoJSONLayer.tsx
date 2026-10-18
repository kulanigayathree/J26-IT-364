import { useEffect, useMemo, useRef } from 'react';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import L from 'leaflet';
import { GeoJSON, useMap } from 'react-leaflet';
import { toLeafletStyle, type MapStyle } from '@/design/mapStyles';

type AnyFeature<P> = Feature<Geometry, P>;

export interface GeoJSONLayerProps<P> {
  data: FeatureCollection<Geometry, P>;
  /** A token-based style, or a function of the feature. Use mapStyles from '@/design/mapStyles'. */
  layerStyle: MapStyle | ((feature: AnyFeature<P>) => MapStyle);
  /** Highlight this feature (by id). */
  selectedId?: string | null;
  /** Defaults to `feature.id`. */
  getId?: (feature: AnyFeature<P>) => string;
  onSelect?: (feature: AnyFeature<P>) => void;
  /** Plain-text tooltip. */
  tooltip?: (feature: AnyFeature<P>) => string;
  /** Zoom the map to this layer when its data changes. */
  fitToData?: boolean;
  interactive?: boolean;
}

const dataKeys = new WeakMap<object, number>();
let nextKey = 1;
function keyFor(data: object): number {
  let key = dataKeys.get(data);
  if (!key) {
    key = nextKey++;
    dataKeys.set(data, key);
  }
  return key;
}

function FitToData({ data }: { data: FeatureCollection }) {
  const map = useMap();
  useEffect(() => {
    if (data.features.length === 0) return;
    const bounds = L.geoJSON(data).getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 10 });
  }, [map, data]);
  return null;
}

/**
 * Draws GeoJSON with token styles. Points become circle markers. Tooltips are plain text
 * (never HTML), so API data cannot inject markup.
 */
export function GeoJSONLayer<P>({
  data,
  layerStyle,
  selectedId = null,
  getId,
  onSelect,
  tooltip,
  fitToData = false,
  interactive = true,
}: GeoJSONLayerProps<P>) {
  // Leaflet binds handlers once per layer: read the latest props through a ref.
  const latest = useRef({ layerStyle, selectedId, getId, onSelect, tooltip });
  latest.current = { layerStyle, selectedId, getId, onSelect, tooltip };

  const resolve = (feature: AnyFeature<P>) => {
    const { layerStyle: s, getId: idOf, selectedId: selected } = latest.current;
    const base = typeof s === 'function' ? s(feature) : s;
    const id = idOf ? idOf(feature) : String(feature.id ?? '');
    return toLeafletStyle(base, selected !== null && id === selected);
  };

  // A new function identity makes react-leaflet re-apply styles (e.g. when the selection changes).
  const styleFn = useMemo(
    () => (feature?: AnyFeature<P>) => (feature ? resolve(feature) : {}),
    // `resolve` reads the latest props from the ref; these are the values that change the look.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layerStyle, selectedId],
  );

  return (
    <>
      <GeoJSON
        key={keyFor(data)}
        data={data}
        interactive={interactive}
        // Leaflet path options (not a CSS style attribute).
        // eslint-disable-next-line no-restricted-syntax
        style={styleFn as L.StyleFunction}
        pointToLayer={(feature, latlng) =>
          L.circleMarker(latlng, { ...resolve(feature as AnyFeature<P>), interactive })
        }
        onEachFeature={(feature, layer) => {
          if (!interactive) return;
          const f = feature as AnyFeature<P>;
          const text = latest.current.tooltip?.(f);
          if (text) {
            const el = document.createElement('span');
            el.textContent = text;
            layer.bindTooltip(el, { sticky: true, direction: 'top' });
          }
          layer.on('click', () => latest.current.onSelect?.(f));
        }}
      />
      {fitToData && <FitToData data={data as FeatureCollection} />}
    </>
  );
}
