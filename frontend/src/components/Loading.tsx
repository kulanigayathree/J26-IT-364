import { LoaderCircle } from 'lucide-react';

export function Loading({ text = 'Loading…' }: { text?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-12 text-muted">
      <LoaderCircle aria-hidden className="h-5 w-5 animate-spin text-sea" />
      <span>{text}</span>
    </div>
  );
}
