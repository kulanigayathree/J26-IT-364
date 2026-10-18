import { useId } from 'react';
import { cn } from '@/lib/cn';
import { Field } from './Field';
import { controlBase, controlClass, type FieldSize } from './fieldStyles';

export interface DatePickerProps {
  label: string;
  /** YYYY-MM-DD, or "" for no date. */
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  hint?: string;
  hideLabel?: boolean;
  size?: FieldSize;
  className?: string;
}

/** Native date input (uses the phone's own date picker on mobile). Dates are treated as UTC. */
export function DatePicker({
  label,
  value,
  onChange,
  min,
  max,
  hint,
  hideLabel,
  size = 'md',
  className,
}: DatePickerProps) {
  const id = useId();
  return (
    <Field id={id} label={label} hint={hint} hideLabel={hideLabel} className={className}>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(controlBase, controlClass[size])}
      />
    </Field>
  );
}
