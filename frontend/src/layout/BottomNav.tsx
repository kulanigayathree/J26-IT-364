import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { isActive } from './isActive';
import type { NavItem } from './types';

const MAX_TABS = 5;

/** Mobile tab bar (below lg). Large touch targets, max 5 items. */
export function BottomNav({ items }: { items: NavItem[] }) {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Main"
      className="pb-safe fixed inset-x-0 bottom-0 z-nav border-t border-line bg-paper lg:hidden"
    >
      <ul className="flex">
        {items.slice(0, MAX_TABS).map((item) => {
          const active = isActive(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.to} className="min-w-0 flex-1">
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-16 flex-col items-center justify-center gap-1 border-t-4 px-1 text-xs no-underline',
                  active ? 'border-t-coral font-bold text-navy' : 'border-t-transparent text-muted',
                )}
              >
                <Icon aria-hidden className="h-5 w-5" />
                <span className="max-w-full truncate">{item.shortLabel}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
