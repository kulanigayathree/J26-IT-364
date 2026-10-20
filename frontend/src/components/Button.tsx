import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'light';
type Size = 'md' | 'lg';

const variants: Record<Variant, string> = {
  // coral-text (not coral) so paper text keeps 4.5:1 contrast
  primary: 'bg-coral-text text-paper border-coral-text hover:bg-navy hover:border-navy',
  secondary: 'bg-paper text-navy border-navy hover:bg-paper-2',
  // for use on navy backgrounds
  light: 'bg-transparent text-paper border-paper hover:bg-navy-deep',
};

const sizes: Record<Size, string> = {
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return `inline-flex items-center justify-center gap-2 rounded border font-bold transition-colors disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${extra}`;
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant, size, className = '', type = 'button', ...rest }: Props) {
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}

export function ButtonLink({
  to,
  variant,
  size,
  className = '',
  children,
}: {
  to: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}
