import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link, type LinkProps } from 'react-router-dom';
import {
  buttonClasses,
  buttonIconClass,
  type ButtonSize,
  type ButtonVariant,
} from './buttonStyles';

interface ButtonLookProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Lucide icon shown before the label. */
  icon?: LucideIcon;
  fullWidth?: boolean;
  children?: ReactNode;
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonLookProps;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size = 'md', icon: Icon, fullWidth, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    >
      {Icon && <Icon aria-hidden className={buttonIconClass[size]} />}
      {children}
    </button>
  );
});

export type ButtonLinkProps = LinkProps & ButtonLookProps;

/** A router link that looks like a Button. */
export function ButtonLink({
  variant,
  size = 'md',
  icon: Icon,
  fullWidth,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, fullWidth, className })} {...rest}>
      {Icon && <Icon aria-hidden className={buttonIconClass[size]} />}
      {children}
    </Link>
  );
}
