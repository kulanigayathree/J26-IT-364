import { useId } from 'react';
import { cn } from '@/lib/cn';

export interface SegmentedOption<V extends string | number> {
  value: V;
  label: string;
}

export interface SegmentedControlProps<V extends string | number> {
  label: string;
  options: SegmentedOption<V>[];
  value: V;
  onChange: (value: V) => void;
  /** `lg` gives 48px touch targets. */
  size?: 'md' | 'lg';
  hideLabel?: boolean;
}

/** Pick one of a few values, e.g. forecast lead time 24 / 48 / 72 h. A radio group underneath. */
export function SegmentedControl<V extends string | number>({
  label,
  options,
  value,
  onChange,
  size = 'md',
  hideLabel,
}: SegmentedControlProps<V>) {
  const name = useId();
  return (
    <fieldset className="min-w-0">
      <legend className={cn('mb-1 text-sm font-bold text-ink', hideLabel && 'sr-only')}>
        {label}
      </legend>
      <div className="inline-flex max-w-full overflow-x-auto rounded border border-navy">
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={String(option.value)}
              className={cn(
                'relative flex cursor-pointer items-center justify-center whitespace-nowrap border-r border-navy font-bold last:border-r-0',
                'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sea',
                size === 'lg' ? 'h-12 min-w-16 px-5 text-base' : 'h-10 min-w-14 px-4 text-sm',
                checked ? 'bg-navy text-paper' : 'bg-paper text-navy hover:bg-paper-2',
              )}
            >
              <input
                type="radio"
                name={name}
                value={String(option.value)}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
