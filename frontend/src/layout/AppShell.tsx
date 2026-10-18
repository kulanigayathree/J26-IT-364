import { Outlet, ScrollRestoration } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { Footer } from './Footer';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import type { Navigation } from './types';

/**
 * The frame around every page. Desktop (lg+): top bar + left sidebar. Mobile: top bar + bottom
 * tab bar. Pages render into <Outlet />. Nav items come from the feature registry.
 */
export function AppShell({ nav }: { nav: Navigation }) {
  return (
    <div className="min-h-dvh bg-paper">
      <a
        href="#main"
        className="sr-only z-nav rounded bg-paper px-4 py-2 font-bold text-navy focus:not-sr-only focus:fixed focus:left-2 focus:top-2"
      >
        Skip to content
      </a>
      <TopBar />
      <div className="flex">
        <Sidebar nav={nav} />
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 pb-24 pt-6 lg:px-8 lg:pb-8">
          <div className="mx-auto max-w-content">
            <Outlet />
            <Footer />
          </div>
        </main>
      </div>
      <BottomNav items={nav.mobile} />
      <ScrollRestoration />
    </div>
  );
}
