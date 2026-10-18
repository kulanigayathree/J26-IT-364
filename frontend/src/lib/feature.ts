import type { FeatureCollection } from 'geojson';
import type { LucideIcon } from 'lucide-react';
import type { RouteObject } from 'react-router-dom';
import type { ColorToken, ComponentId, Severity } from '@/design/tokens';
import type { Loaded } from './apiClient';

/** Every feature folder exports one of these from manifest.ts. The nav is built from them. */
export interface FeatureManifest {
  id: ComponentId;
  /** Full name, shown in the sidebar and page headers. */
  title: string;
  /** One or two words, shown in the mobile tab bar. */
  shortTitle: string;
  /** One sentence for the Overview and About pages. */
  description: string;
  icon: LucideIcon;
  /** Base path, e.g. "/c2". All the feature's routes live under it. */
  route: `/${string}`;
  /** Owner name (see README team table). */
  owner: string;
  /** Layer colour on the Overview map. Use componentColors from tokens. */
  mapLayerColor: ColorToken;
  showOnMobileNav: boolean;
  /** Optional: where the mobile tab bar links to, if different from `route` (C2 → fisher view). */
  mobileRoute?: `/${string}`;
}

/** One alert or highlight a feature shows on the Overview page. */
export interface OverviewAlert {
  id: string;
  title: string;
  detail: string;
  /** ISO 8601 UTC. */
  time: string;
  severity?: Severity;
  /** Short tag shown when there is no severity, e.g. "Forecast". */
  tag?: string;
  /** In-app link to the details. */
  href: string;
}

export interface OverviewData {
  /** Drawn on the Overview map in the feature's mapLayerColor. */
  layer: FeatureCollection;
  /** Newest first. The Overview shows the first few. */
  alerts: OverviewAlert[];
}

/** What src/features/registry.ts lists for each component. */
export interface FeatureModule {
  manifest: FeatureManifest;
  /** Routes relative to manifest.route. Rendered inside AppShell. */
  routes: RouteObject[];
  loadOverview: (signal?: AbortSignal) => Promise<Loaded<OverviewData>>;
}
