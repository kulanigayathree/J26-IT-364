import { ChevronRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** Large dashboard tile that opens a component page. */
export function Tile({
  to,
  icon: Icon,
  title,
  description,
  keyNumber,
  owner,
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  keyNumber: ReactNode;
  owner: string;
}) {
  return (
    <Link
      to={to}
      className="group flex min-h-48 flex-col rounded border border-line bg-paper p-5 hover:border-navy hover:bg-paper-2"
    >
      <div className="flex items-start justify-between gap-3">
        <Icon aria-hidden className="h-8 w-8 shrink-0 text-coral" />
        <ChevronRight aria-hidden className="h-5 w-5 text-muted group-hover:text-navy" />
      </div>
      <h2 className="mt-3 text-xl">{title}</h2>
      <p className="mt-1 font-serif text-muted">{description}</p>
      <p className="mt-4 text-2xl font-bold text-navy">{keyNumber}</p>
      <p className="mt-auto pt-3 text-xs text-muted">Owner: {owner}</p>
    </Link>
  );
}
