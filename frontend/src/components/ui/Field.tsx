import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  hideLabel?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({ id, label, hint, hideLabel, className, children }: FieldProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <label htmlFor={id} className={cn('text-sm font-bold text-ink', hideLabel && 'sr-only')}>
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
