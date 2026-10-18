import type { NavItem } from './types';

export function isActive(item: NavItem, pathname: string): boolean {
  const prefix = item.matchPrefix ?? item.to;
  if (prefix === '/') return pathname === '/';
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}
