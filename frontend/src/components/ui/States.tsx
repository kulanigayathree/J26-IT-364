import type { ReactNode } from 'react';
import { CircleX, Inbox, LoaderCircle, RotateCcw, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

interface StateFrameProps {
  icon: LucideIcon;
  iconClass: string;
  title: string;
  message?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  role?: 'status' | 'alert';
}

function StateFrame({
  icon: Icon,
  iconClass,
  title,
  message,
  action,
  compact,
  role,
}: StateFrameProps) {
  return (
    <div
      role={role}
      className={cn(
        'flex flex-col items-center justify-center rounded border border-line bg-paper text-center',
        compact ? 'gap-1 px-4 py-6' : 'gap-2 px-6 py-12',
      )}
    >
      <Icon aria-hidden className={cn(compact ? 'h-6 w-6' : 'h-8 w-8', iconClass)} />
      <p className="text-base font-bold text-navy">{title}</p>
      {message && <div className="max-w-prose text-sm text-muted">{message}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export interface EmptyStateProps {
  title?: string;
  message?: ReactNode;
  action?: ReactNode;
  icon?: LucideIcon;
  compact?: boolean;
}

export function EmptyState({
  title = 'Nothing to show yet',
  message,
  action,
  icon = Inbox,
  compact,
}: EmptyStateProps) {
  return (
    <StateFrame
      icon={icon}
      iconClass="text-muted"
      title={title}
      message={message}
      action={action}
      compact={compact}
    />
  );
}

export interface LoadingStateProps {
  label?: string;
  compact?: boolean;
}

export function LoadingState({ label = 'Loading data…', compact }: LoadingStateProps) {
  return (
    <StateFrame
      role="status"
      icon={LoaderCircle}
      iconClass="animate-spin text-sea"
      title={label}
      compact={compact}
    />
  );
}

export interface ErrorStateProps {
  title?: string;
  error?: Error | string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({
  title = 'Could not load this data',
  error,
  onRetry,
  compact,
}: ErrorStateProps) {
  const message = typeof error === 'string' ? error : error?.message;
  return (
    <StateFrame
      role="alert"
      icon={CircleX}
      iconClass="text-coral-text"
      title={title}
      message={message ?? 'Please try again in a moment.'}
      compact={compact}
      action={
        onRetry && (
          <Button variant="secondary" size="sm" icon={RotateCcw} onClick={onRetry}>
            Try again
          </Button>
        )
      }
    />
  );
}
