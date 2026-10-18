import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { isActive } from './isActive';
import type { NavItem, Navigation } from './types';

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 border-l-4 px-4 py-2 text-sm no-underline',
        active
          ? 'border-l-coral bg-paper font-bold text-navy'
          : 'border-l-transparent text-ink hover:bg-paper hover:text-navy',
      )}
    >
      <Icon aria-hidden className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 leading-tight">{item.label}</span>
      {item.tag && <span className="text-xs font-bold text-muted">{item.tag}</span>}
    </Link>
  );
}

/** Desktop navigation (lg and up). */
export function Sidebar({ nav }: { nav: Navigation }) {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Main"
      className="sticky top-14 hidden h-sidebar w-sidebar shrink-0 flex-col overflow-y-auto border-r border-line bg-paper-2 py-4 lg:flex"
    >
      <p className="px-4 pb-2 text-xs font-bold uppercase tracking-wide text-muted">Monitoring</p>
      <ul>
        {nav.primary.map((item) => (
          <li key={item.to}>
            <SidebarLink item={item} active={isActive(item, pathname)} />
          </li>
        ))}
      </ul>
      <p className="mt-6 px-4 pb-2 text-xs font-bold uppercase tracking-wide text-muted">Project</p>
      <ul>
        {nav.secondary.map((item) => (
          <li key={item.to}>
            <SidebarLink item={item} active={isActive(item, pathname)} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
