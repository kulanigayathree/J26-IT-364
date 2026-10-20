import type { LucideIcon } from 'lucide-react';

/** Information-only card (landing page). */
export function InfoCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded border border-line bg-paper p-5">
      <Icon aria-hidden className="h-7 w-7 text-coral" />
      <h3 className="mt-3 text-lg">{title}</h3>
      <p className="mt-1 font-serif text-muted">{text}</p>
    </div>
  );
}
