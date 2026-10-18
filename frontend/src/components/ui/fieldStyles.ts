export type FieldSize = 'md' | 'lg';

/** Shared input look for Select and DatePicker. */
export const controlClass: Record<FieldSize, string> = {
  md: 'h-10 px-3 text-sm',
  lg: 'h-14 px-4 text-lg',
};

export const controlBase =
  'w-full min-w-0 rounded border border-muted bg-paper font-sans text-ink hover:border-navy disabled:opacity-50';
