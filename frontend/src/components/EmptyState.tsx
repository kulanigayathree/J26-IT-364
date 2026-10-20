import { Inbox } from 'lucide-react';

export function EmptyState({ message = 'No data yet.' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded border border-line bg-paper p-6 text-center">
      <Inbox aria-hidden className="h-7 w-7 text-muted" />
      <p className="text-muted">{message}</p>
    </div>
  );
}
