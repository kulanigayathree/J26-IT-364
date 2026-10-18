import type { LucideIcon } from 'lucide-react';

/** One navigation entry. Built automatically in src/app/navigation.ts: do not hand-write nav. */
export interface NavItem {
  to: string;
  label: string;
  /** Mobile tab-bar label. */
  shortLabel: string;
  icon: LucideIcon;
  /** e.g. "C1". */
  tag?: string;
  /** Highlight the item for every path under this prefix. Defaults to `to`. */
  matchPrefix?: string;
}

export interface Navigation {
  primary: NavItem[];
  secondary: NavItem[];
  /** At most 5 items. */
  mobile: NavItem[];
}
