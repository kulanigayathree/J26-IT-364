import { Info, LayoutDashboard, Palette } from 'lucide-react';
import { features } from '@/features/registry';
import type { NavItem, Navigation } from '@/layout';

/** Navigation is generated from the feature registry. Do not hand-edit nav items. */
const overview: NavItem = {
  to: '/',
  label: 'Overview',
  shortLabel: 'Overview',
  icon: LayoutDashboard,
};

const featureItems = features.map(({ manifest }) => ({
  manifest,
  item: {
    to: manifest.route,
    label: manifest.title,
    shortLabel: manifest.shortTitle,
    icon: manifest.icon,
    tag: manifest.id.toUpperCase(),
  } satisfies NavItem,
}));

export const navigation: Navigation = {
  primary: [overview, ...featureItems.map((f) => f.item)],
  secondary: [
    { to: '/about', label: 'About the project', shortLabel: 'About', icon: Info },
    { to: '/styleguide', label: 'Styleguide', shortLabel: 'Styles', icon: Palette },
  ],
  mobile: [
    overview,
    ...featureItems
      .filter((f) => f.manifest.showOnMobileNav)
      .map((f) => ({
        ...f.item,
        to: f.manifest.mobileRoute ?? f.manifest.route,
        matchPrefix: f.manifest.route,
      })),
  ].slice(0, 5),
};
