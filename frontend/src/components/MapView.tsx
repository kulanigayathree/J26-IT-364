import 'leaflet/dist/leaflet.css';
import { useEffect, type ReactNode } from 'react';
import type { LatLngBoundsExpression } from 'leaflet';
import { MapContainer, ScaleControl, TileLayer, useMap } from 'react-leaflet';

const heights = {
  sm: 'h-64',
  md: 'h-80 md:h-96',
  lg: 'h-96 md:h-[32rem]',
};

interface Props {
  /** Describes the map for screen-reader users. */
  label: string;
  height?: keyof typeof heights;
  center?: [number, number];
  zoom?: number;
  /** false = a static picture of the map (landing page) */
  interactive?: boolean;
  children?: ReactNode;
}

/** Shared map: OpenStreetMap, centred on Sri Lanka (7.9 N, 80.7 E). */
export function MapView({ label, height = 'md', center = [7.9, 80.7], zoom = 7, interactive = true, children }: Props) {
  return (
    <div role="region" aria-label={label} className="relative isolate overflow-hidden rounded border border-line">
      <MapContainer
        center={center}
        zoom={zoom}
        preferCanvas
        className={`w-full ${heights[height]}`}
        dragging={interactive}
        zoomControl={interactive}
        scrollWheelZoom={false}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        boxZoom={interactive}
        keyboard={interactive}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {interactive && <ScaleControl position="bottomleft" imperial={false} />}
        {children}
      </MapContainer>
    </div>
  );
}

/** Put inside a MapView to zoom to an area when it changes. */
export function FitBounds({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 11 });
  }, [map, bounds]);
  return null;
}
