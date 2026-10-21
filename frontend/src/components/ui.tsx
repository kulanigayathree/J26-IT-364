import type { ReactNode } from 'react';
import { AlertTriangle, CircleAlert, CircleCheck, CircleX, FlaskConical, Inbox, LoaderCircle } from 'lucide-react';
import type { Severity } from '../types/common';

/* ---------------------------------------------------------------- class helpers */

export const th = 'px-3 py-2.5 text-left font-mono text-[11px] font-normal text-muted whitespace-nowrap';
export const td = 'px-3 py-2.5 text-[13.5px] text-ink/85';

export const inputCls =
  'h-11 w-full rounded-[4px] border border-line bg-white px-3 text-[14.5px] text-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-tide focus:ring-2 focus:ring-tide/20';

/** Coral action button (Analyse, Detect …). */
export const actionBtn =
  'inline-flex h-11 items-center justify-center gap-2 rounded-[4px] bg-coral px-6 text-[14.5px] font-medium whitespace-nowrap text-white transition-colors duration-150 hover:bg-[#b9532f] disabled:opacity-45';

/** Dark primary button (Register, Login …). */
export const primaryBtn =
  'inline-flex h-11 items-center justify-center gap-2 rounded-[4px] bg-deep px-6 text-[15px] font-medium whitespace-nowrap text-paper transition-colors duration-150 hover:bg-deep-2 disabled:opacity-60';

export const secondaryBtn =
  'inline-flex h-11 items-center justify-center gap-2 rounded-[4px] border border-deep/30 px-6 text-[15px] whitespace-nowrap text-deep transition-colors duration-150 hover:border-deep hover:bg-paper';

/* ---------------------------------------------------------------- layout pieces */

export function Panel({ title, icon, children, className = '' }: { title: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[4px] border border-line bg-white p-5 md:p-6 ${className}`}>
      <h2 className="flex items-center gap-2.5 font-display text-[21px] leading-tight text-deep">
        {icon}
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <h2 className="font-display text-[22px] leading-tight text-deep">{children}</h2>
      {aside}
    </div>
  );
}

/** Summary figures. The first is the headline, the rest support it. */
export function StatRow({ items }: { items: { label: string; value: ReactNode; note?: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 border-y border-line md:grid-cols-4">
      {items.map((s, i) => (
        <div
          key={s.label}
          className={`px-4 py-4 md:px-5 ${i % 2 ? 'border-l border-line' : ''} ${i >= 2 ? 'border-t border-line md:border-t-0' : ''} ${i === 2 ? 'md:border-l' : ''}`}
        >
          <dt className="font-mono text-[11px] text-muted">{s.label}</dt>
          <dd className={`mt-1.5 font-display leading-none text-deep ${i === 0 ? 'text-[32px]' : 'text-[26px]'}`}>{s.value}</dd>
          {s.note && <p className="mt-1.5 text-[12.5px] text-muted">{s.note}</p>}
        </div>
      ))}
    </dl>
  );
}

/** Amber note (missing files, warnings). */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[3px] border border-[#e6d3a8] border-l-[3px] border-l-amber bg-amber-soft px-4 py-3 text-[13px] leading-[1.6] text-ink/80">
      {children}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-ink">{label}</span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

/** One-of-several picker (Day 1/2/3, Probability/Uncertainty …). */
export function Segmented<V extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
}) {
  return (
    <div>
      <span className="text-[13px] font-medium text-ink">{label}</span>
      <div role="radiogroup" aria-label={label} className="mt-1.5 flex overflow-hidden rounded-[4px] border border-deep/25 bg-white">
        {options.map((o, i) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            onClick={() => onChange(o.value)}
            className={`h-11 min-w-0 flex-1 px-2 text-[14px] whitespace-nowrap transition-colors duration-150 ${i ? 'border-l border-deep/15' : ''} ${
              o.value === value ? 'bg-deep font-medium text-paper' : 'text-ink/80 hover:bg-sand/60'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- badges */

export function SampleBadge() {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-[3px] border border-coral-soft bg-coral-soft/30 px-2 text-[11.5px] font-medium whitespace-nowrap text-coral">
      <FlaskConical className="size-3.5" strokeWidth={1.75} />
      Sample data
    </span>
  );
}

const SEV = {
  high: { label: 'High', cls: 'border-coral/50 text-coral', Icon: CircleAlert },
  medium: { label: 'Medium', cls: 'border-amber/50 text-amber-text', Icon: AlertTriangle },
  low: { label: 'Low', cls: 'border-tide/50 text-tide', Icon: CircleCheck },
};

/** Severity always shows a word and an icon, never colour only. */
export function SeverityBadge({ level }: { level: Severity }) {
  const { label, cls, Icon } = SEV[level];
  return (
    <span className={`inline-flex h-6 items-center gap-1 rounded-[3px] border bg-white px-1.5 text-[12px] whitespace-nowrap ${cls}`}>
      <Icon className="size-3.5" strokeWidth={1.75} />
      {label}
    </span>
  );
}

/** Outlined label for statuses (Active, At risk, Saved model results …). */
export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info' }) {
  const cls = {
    neutral: 'border-line text-muted',
    good: 'border-tide/50 text-tide',
    warn: 'border-amber/60 text-amber-text',
    bad: 'border-coral/50 text-coral',
    info: 'border-deep/30 text-deep',
  }[tone];
  return <span className={`inline-flex h-6 items-center rounded-[3px] border bg-white px-2 text-[12px] whitespace-nowrap ${cls}`}>{children}</span>;
}

export function CandidateBadge({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[3px] border border-amber/60 bg-amber-soft px-1.5 whitespace-nowrap text-amber-text ${small ? 'h-5 text-[11px]' : 'h-6 text-[12px]'}`}
    >
      <AlertTriangle className="size-3.5" strokeWidth={1.75} />
      Candidate, not proof
    </span>
  );
}

/** Small round swatch for legends. */
export function Dot({ className }: { className: string }) {
  return <span aria-hidden className={`inline-block size-2.5 shrink-0 rounded-full ${className}`} />;
}

/* ---------------------------------------------------------------- states */

export function Loading({ text = 'Loading…' }: { text?: string }) {
  return (
    <div role="status" className="flex items-center gap-2.5 py-10 text-[14px] text-muted">
      <LoaderCircle aria-hidden className="size-5 animate-spin text-tide" strokeWidth={1.75} />
      {text}
    </div>
  );
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-[3px] border border-coral-soft border-l-[3px] border-l-coral bg-white px-4 py-4">
      <p className="flex items-center gap-2 font-display text-[18px] text-deep">
        <CircleX className="size-5 text-coral" strokeWidth={1.75} />
        Could not load the data
      </p>
      <p className="mt-1 text-[13.5px] text-muted">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 text-[13.5px] font-medium text-tide hover:text-deep">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message = 'No data yet.' }: { message?: string }) {
  return (
    <p className="flex items-center gap-2.5 border-t border-line pt-4 text-[14px] text-muted">
      <Inbox className="size-5 shrink-0" strokeWidth={1.5} />
      {message}
    </p>
  );
}
