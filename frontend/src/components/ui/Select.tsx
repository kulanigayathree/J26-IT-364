import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Field } from './Field';
import { controlBase, controlClass, type FieldSize } from './fieldStyles';

export interface SelectOption<V extends string> {
  value: V;
  label: string;
}

export interface SelectProps<V extends string> {
  label: string;
  options: SelectOption<V>[];
  value: V;
  onChange: (value: V) => void;
  hint?: string;
  hideLabel?: boolean;
  size?: FieldSize;
  disabled?: boolean;
  className?: string;
}

/** Native <select> with the shared label and look. */
export function Select<V extends string>({
  label,
  options,
  value,
  onChange,
  hint,
  hideLabel,
  size = 'md',
  disabled,
  className,
}: SelectProps<V>) {
  const id = useId();
  return (
    <Field id={id} label={label} hint={hint} hideLabel={hideLabel} className={className}>
      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={disabled}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(event) => onChange(event.target.value as V)}
          className={cn(controlBase, controlClass[size], 'cursor-pointer appearance-none pr-10')}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        />
      </div>
    </Field>
  );
}
