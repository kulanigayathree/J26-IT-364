import { Ship } from 'lucide-react';
import { componentColors } from '@/design/tokens';
import type { FeatureManifest } from '@/lib/feature';

export const manifest: FeatureManifest = {
  id: 'c1',
  title: 'Vessel Behaviour Anomaly Detection',
  shortTitle: 'Vessels',
  description:
    'Flags unusual vessel behaviour (AIS gaps, loitering, route deviations, dark vessels) from AIS tracks and Sentinel-1 SAR detections.',
  icon: Ship,
  route: '/c1',
  owner: 'Pathirana K.G.T.K.S',
  mapLayerColor: componentColors.c1,
  showOnMobileNav: true,
};
