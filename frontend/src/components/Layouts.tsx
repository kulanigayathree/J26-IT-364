import type { ReactNode } from 'react';
import { AppNavbar } from './AppNavbar';
import { Footer } from './Footer';
import { PublicNavbar } from './PublicNavbar';

/** Frame for logged-in pages (dashboard, C1–C4). */
export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppNavbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <Footer />
    </div>
  );
}

/** Frame for public pages (landing). The navbar shows "Go to dashboard" when logged in. */
export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
