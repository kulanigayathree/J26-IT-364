# Shared geographic layers

## `sl-eez-approx.json` (placeholder, must be replaced)

A hand-drawn, simplified outline of Sri Lanka's Exclusive Economic Zone so the maps have a
boundary during development. **It is approximate and must not be used for analysis.**

To replace it:

1. Download the Sri Lanka EEZ from Marine Regions (https://www.marineregions.org/, "Sri Lankan
   Exclusive Economic Zone" in the Maritime Boundaries / EEZ dataset) as GeoJSON (WGS84).
   Record the dataset version and licence in `docs/datasets/`.
2. Simplify it for the web (e.g. `mapshaper -simplify 5% keep-shapes`) so the file stays small.
3. Save it here with the same name, keeping a `FeatureCollection` with `properties.name`, and
   remove "approximate" from the legend label in `src/components/map/EezLayer.tsx`.
4. Use the same file for spatial filtering in the API / PostGIS so the frontend and backend agree.
