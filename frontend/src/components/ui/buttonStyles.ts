import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
/** `lg` is a large touch target (56px) for the mobile fisher view. */
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded border font-sans font-bold leading-none no-underline transition-colors disabled:pointer-events-none disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  primary: 'border-coral-text bg-coral-text text-paper hover:border-navy hover:bg-navy',
  secondary: 'border-navy bg-paper text-navy hover:bg-paper-2',
  ghost: 'border-transparent bg-transparent text-sea hover:bg-paper-2',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-14 px-6 text-lg',
};

export function buttonClasses(options: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}): string {
  const { variant = 'primary', size = 'md', fullWidth, className } = options;
  return cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className);
}

export const buttonIconClass: Record<ButtonSize, string> = {
  sm: 'h-4 w-4 shrink-0',
  md: 'h-4 w-4 shrink-0',
  lg: 'h-5 w-5 shrink-0',
};
