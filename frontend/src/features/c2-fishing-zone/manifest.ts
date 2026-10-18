import { Fish } from 'lucide-react';
import { componentColors } from '@/design/tokens';
import type { FeatureManifest } from '@/lib/feature';

export const manifest: FeatureManifest = {
  id: 'c2',
  title: 'Fishing-Zone Prediction',
  shortTitle: 'Fishing',
  description:
    'Catch-conditioned 72-hour forecast of likely fishing zones with uncertainty, ranked by expected catch and fuel cost from each harbour.',
  icon: Fish,
  route: '/c2',
  owner: 'Gayathree M.G.K',
  mapLayerColor: componentColors.c2,
  showOnMobileNav: true,
  // Fishers use the app on phones: the mobile tab opens the simple fisher view.
  mobileRoute: '/c2/fisher',
};
