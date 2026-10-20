import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

export const inputClass =
  'h-11 w-full rounded border border-muted bg-paper px-3 text-base text-ink hover:border-navy';

/** Label + input + error message. */
export function FormField({
  label,
  error,
  ...input
}: { label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`${inputClass} ${error ? 'border-coral-text' : ''}`}
        {...input}
      />
      {error && (
        <p id={`${id}-err`} className="text-sm text-coral-text">
          {error}
        </p>
      )}
    </div>
  );
}

/** Centred card for the login and register pages. */
export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 py-10">
      <p className="mb-4 text-xl font-bold text-navy">Ocean AI – Marine Monitoring</p>
      <div className="w-full max-w-md rounded border border-line bg-paper p-6 shadow">
        <h1 className="mb-4 text-2xl">{title}</h1>
        {children}
      </div>
    </div>
  );
}
