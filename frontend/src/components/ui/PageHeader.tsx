import { useEffect, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { APP_SHORT_NAME } from '@/lib/config';

export interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  /** Small label above the title, e.g. "C2 · Fishing-zone prediction". */
  eyebrow?: ReactNode;
  /** Buttons, filters or a DataSourceNote, shown on the right (below the title on mobile). */
  actions?: ReactNode;
  /** Link back to the parent page. */
  back?: { to: string; label: string };
}

/** The first thing on every page. Also sets the browser tab title. */
export function PageHeader({ title, subtitle, eyebrow, actions, back }: PageHeaderProps) {
  useEffect(() => {
    document.title = `${title} · ${APP_SHORT_NAME}`;
  }, [title]);

  return (
    <header className="mb-6 border-b border-line pb-4">
      {back && (
        <Link
          to={back.to}
          className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-sea hover:underline"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-coral-text">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && (
            <p className="mt-1 max-w-prose font-serif text-base text-muted">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>
        )}
      </div>
    </header>
  );
}
