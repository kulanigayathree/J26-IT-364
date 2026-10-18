/**
 * The feature registry: the only list of components in the app.
 * Navigation, routes and the Overview page are generated from it. Members should not need to
 * change this file; if you do (e.g. renaming an export), say so in your PR.
 */
import type { FeatureModule } from '@/lib/feature';
import { fetchOverview as c1Overview } from './c1-vessel-anomaly/api';
import { manifest as c1Manifest } from './c1-vessel-anomaly/manifest';
import { routes as c1Routes } from './c1-vessel-anomaly/routes';
import { fetchOverview as c2Overview } from './c2-fishing-zone/api';
import { manifest as c2Manifest } from './c2-fishing-zone/manifest';
import { routes as c2Routes } from './c2-fishing-zone/routes';
import { fetchOverview as c3Overview } from './c3-reef-health/api';
import { manifest as c3Manifest } from './c3-reef-health/manifest';
import { routes as c3Routes } from './c3-reef-health/routes';
import { fetchOverview as c4Overview } from './c4-oil-spill/api';
import { manifest as c4Manifest } from './c4-oil-spill/manifest';
import { routes as c4Routes } from './c4-oil-spill/routes';

export const features: FeatureModule[] = [
  { manifest: c1Manifest, routes: c1Routes, loadOverview: c1Overview },
  { manifest: c2Manifest, routes: c2Routes, loadOverview: c2Overview },
  { manifest: c3Manifest, routes: c3Routes, loadOverview: c3Overview },
  { manifest: c4Manifest, routes: c4Routes, loadOverview: c4Overview },
];
