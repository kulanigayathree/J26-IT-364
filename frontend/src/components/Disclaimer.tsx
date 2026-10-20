import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

export function Disclaimer({ children = 'Model output – not field-confirmed.' }: { children?: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded border border-line border-l-4 border-l-amber bg-paper-2 px-3 py-2 text-sm">
      <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
      <span>{children}</span>
    </p>
  );
}
