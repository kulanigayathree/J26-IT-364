import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SectionProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** A titled block of a page. Sections stack with consistent spacing. */
export function Section({ title, description, actions, className, children }: SectionProps) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={cn('mt-8 first:mt-0', className)}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id={id} className="text-xl font-bold">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-end gap-3">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
