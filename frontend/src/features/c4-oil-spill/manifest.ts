import { Droplets } from 'lucide-react';
import { componentColors } from '@/design/tokens';
import type { FeatureManifest } from '@/lib/feature';

export const manifest: FeatureManifest = {
  id: 'c4',
  title: 'Oil-Spill Detection and Vessel Attribution',
  shortTitle: 'Spills',
  description:
    'Detects oil slicks in Sentinel-1 SAR images and ranks candidate source vessels from AIS evidence.',
  icon: Droplets,
  route: '/c4',
  owner: 'Jayasundara K.H.W.M.G.M',
  mapLayerColor: componentColors.c4,
  showOnMobileNav: true,
};
