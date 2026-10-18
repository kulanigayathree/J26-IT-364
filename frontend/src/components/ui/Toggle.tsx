import { useId } from 'react';
import { cn } from '@/lib/cn';

export interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

/** On/off switch, e.g. "Show uncertainty layer". */
export function Toggle({ label, checked, onChange, description }: ToggleProps) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-desc` : undefined}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors',
          checked ? 'border-navy bg-navy' : 'border-muted bg-paper-2',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'inline-block h-4 w-4 rounded-full transition-transform',
            checked ? 'translate-x-5 bg-paper' : 'translate-x-1 bg-muted',
          )}
        />
      </button>
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-sm font-bold text-ink">
          {label}
        </label>
        {description && (
          <p id={`${id}-desc`} className="text-xs text-muted">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
