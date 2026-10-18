import { Shell } from 'lucide-react';
import { componentColors } from '@/design/tokens';
import type { FeatureManifest } from '@/lib/feature';

export const manifest: FeatureManifest = {
  id: 'c3',
  title: 'Reef Health Monitoring',
  shortTitle: 'Reefs',
  description:
    'Monthly satellite-derived benthic cover (coral, algae, sand/rubble) per reef, compared with heat stress (degree heating weeks).',
  icon: Shell,
  route: '/c3',
  owner: 'Adikaram W.M.T.P',
  mapLayerColor: componentColors.c3,
  showOnMobileNav: true,
};
