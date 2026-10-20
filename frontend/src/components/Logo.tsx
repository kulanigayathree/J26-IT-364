import { Waves } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="flex min-w-0 items-center gap-2 text-paper">
      <Waves aria-hidden className="h-6 w-6 shrink-0 text-coral" />
      <span className="truncate text-lg font-bold">
        <span className="sm:hidden">Ocean AI</span>
        <span className="hidden sm:inline">Ocean AI – Marine Monitoring</span>
      </span>
    </Link>
  );
}
