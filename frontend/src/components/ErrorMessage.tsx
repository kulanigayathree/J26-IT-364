import { CircleX } from 'lucide-react';
import { Button } from './Button';

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded border border-line border-l-4 border-l-coral-text bg-paper p-6 text-center">
      <CircleX aria-hidden className="h-7 w-7 text-coral-text" />
      <p className="font-bold text-navy">Could not load the data</p>
      <p className="text-sm text-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
