import { FlaskConical, Info, Waves, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { APP_NAME, APP_SHORT_NAME, USE_MOCKS } from '@/lib/config';
import { useOnlineStatus } from '@/lib/useOnlineStatus';

export function TopBar() {
  const online = useOnlineStatus();
  return (
    <header className="sticky top-0 z-nav flex h-topbar items-center justify-between gap-3 bg-navy px-4 text-paper lg:px-6">
      <Link to="/" className="flex min-w-0 items-center gap-2 text-paper no-underline">
        <Waves aria-hidden className="h-6 w-6 shrink-0 text-coral" />
        <span className="truncate text-lg font-bold">
          <span className="lg:hidden">{APP_SHORT_NAME}</span>
          <span className="hidden lg:inline">{APP_NAME}</span>
        </span>
      </Link>
      <div className="flex shrink-0 items-center gap-3 text-sm">
        {!online && (
          <span className="flex items-center gap-1 font-bold" role="status">
            <WifiOff aria-hidden className="h-4 w-4 text-coral" />
            Offline
          </span>
        )}
        {USE_MOCKS && (
          <span className="hidden items-center gap-1 text-line sm:flex" title="VITE_USE_MOCKS=true">
            <FlaskConical aria-hidden className="h-4 w-4" />
            Mock fallback on
          </span>
        )}
        <Link
          to="/about"
          className="flex h-10 w-10 items-center justify-center rounded text-paper hover:bg-navy-deep lg:hidden"
          aria-label="About this app"
        >
          <Info aria-hidden className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
