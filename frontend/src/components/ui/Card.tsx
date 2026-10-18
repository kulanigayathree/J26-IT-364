import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface CardProps {
  title?: ReactNode;
  description?: ReactNode;
  /** Buttons or controls shown on the right of the title. */
  actions?: ReactNode;
  /** `alt` uses the alternate panel colour (paper-2). */
  tone?: 'default' | 'alt';
  /** `none` for tables and maps that run edge to edge. */
  padding?: 'none' | 'md';
  headingLevel?: 2 | 3;
  as?: 'section' | 'div' | 'article';
  className?: string;
  children?: ReactNode;
}

export function Card({
  title,
  description,
  actions,
  tone = 'default',
  padding = 'md',
  headingLevel = 2,
  as: Tag = 'section',
  className,
  children,
}: CardProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const hasHeader = title || description || actions;
  return (
    <Tag
      className={cn(
        'min-w-0 rounded border border-line',
        tone === 'alt' ? 'bg-paper-2' : 'bg-paper',
        className,
      )}
    >
      {hasHeader && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            {title && <Heading className="text-lg font-bold leading-snug">{title}</Heading>}
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={padding === 'md' ? 'p-4' : undefined}>{children}</div>
    </Tag>
  );
}
