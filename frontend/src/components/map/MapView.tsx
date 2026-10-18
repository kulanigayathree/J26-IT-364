import 'leaflet/dist/leaflet.css';
import { useEffect, type ReactNode } from 'react';
import type { LatLngTuple } from 'leaflet';
import { LayersControl, MapContainer, ScaleControl, TileLayer, useMap } from 'react-leaflet';
import { cn } from '@/lib/cn';
import { SRI_LANKA_CENTER, SRI_LANKA_ZOOM } from './constants';
import { EezLayer } from './EezLayer';

const heightClass = {
  sm: 'h-map-sm',
  md: 'h-map-md',
  lg: 'h-map-lg',
} as const;

export interface MapViewProps {
  /** Describes the map for screen-reader users, e.g. "Map of vessel anomalies". */
  label: string;
  height?: keyof typeof heightClass;
  center?: LatLngTuple;
  zoom?: number;
  showEez?: boolean;
  /** Adds an OpenStreetMap / Esri satellite switch (top right). */
  satelliteToggle?: boolean;
  /** Edge to edge on phones (full width), boxed from md up. */
  bleed?: boolean;
  /** Map layers: GeoJSONLayer, or other react-leaflet layers. */
  children?: ReactNode;
  /** Drawn on top of the map but outside Leaflet: MapLegend, MapStatus. */
  overlay?: ReactNode;
}

/** Keep Leaflet's size in sync with its responsive container. */
function ResizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

/**
 * The one base map for the whole app: OpenStreetMap (+ optional Esri satellite), scale bar,
 * EEZ outline, centred on Sri Lanka.
 */
export function MapView({
  label,
  height = 'md',
  center = SRI_LANKA_CENTER,
  zoom = SRI_LANKA_ZOOM,
  showEez = true,
  satelliteToggle = true,
  bleed = false,
  children,
  overlay,
}: MapViewProps) {
  return (
    <div
      role="region"
      aria-label={label}
      className={cn(
        'relative isolate overflow-hidden border-line bg-paper-2',
        bleed ? '-mx-4 border-y md:mx-0 md:rounded md:border' : 'rounded border',
      )}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={5}
        maxZoom={14}
        worldCopyJump
        className={cn('w-full', heightClass[height])}
      >
        <ResizeWatcher />
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Map (OpenStreetMap)">
            <TileLayer
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
          {satelliteToggle && (
            <LayersControl.BaseLayer name="Satellite (Esri)">
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="Imagery &copy; Esri, Maxar, Earthstar Geographics"
                maxZoom={18}
              />
            </LayersControl.BaseLayer>
          )}
        </LayersControl>
        <ScaleControl position="bottomleft" imperial={false} />
        {showEez && <EezLayer />}
        {children}
      </MapContainer>
      {overlay}
    </div>
  );
}
