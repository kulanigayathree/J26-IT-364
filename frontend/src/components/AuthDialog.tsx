import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { ROLE_LABELS, useAuth, type Role } from '../auth/AuthContext';
import { Logo } from './Logo';

export type AuthMode = 'login' | 'register';

const ease = [0.23, 1, 0.32, 1] as const;

/** Login / register pop-up. Calls the real API (/api/auth/login, /api/auth/register). */
export function AuthDialog({
  mode,
  onModeChange,
  onClose,
  onAuthenticated,
}: {
  mode: AuthMode | null;
  onModeChange: (m: AuthMode) => void;
  onClose: () => void;
  onAuthenticated: () => void;
}) {
  const { login, register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', role: '' as Role | '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setErrors({}), [mode]);

  useEffect(() => {
    if (!mode) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, onClose]);

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (mode === 'register' && form.name.trim().length < 2) next.name = 'Please enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address.';
    if (mode === 'register' && !form.role) next.role = 'Select the option that best describes you.';
    if (form.password.length < 8) next.password = 'Password must be at least 8 characters.';
    if (mode === 'register' && form.confirm !== form.password) next.confirm = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      if (mode === 'register') {
        await register({ name: form.name.trim(), email: form.email, password: form.password, role: form.role as Role });
      } else {
        await login(form.email, form.password);
      }
      setForm({ name: '', email: '', role: '', password: '', confirm: '' });
      onAuthenticated();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {mode && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-abyss/60 px-4 py-16 md:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease }}
            className="w-full max-w-[440px] rounded-[6px] border border-line bg-paper shadow-[0_12px_40px_rgba(6,26,38,0.18)]"
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <Logo />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-2 flex size-9 items-center justify-center rounded-[4px] text-muted transition-colors duration-150 hover:bg-sand hover:text-ink"
              >
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="grid grid-cols-2 border-b border-line" role="tablist">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => onModeChange(m)}
                  className={`h-12 border-b-2 text-[14.5px] transition-colors duration-150 ${
                    mode === m ? 'border-deep font-medium text-deep' : 'border-transparent text-muted hover:text-ink'
                  }`}
                >
                  {m === 'login' ? 'Login' : 'Register'}
                </button>
              ))}
            </div>

            <form onSubmit={submit} noValidate className="px-6 pb-7 pt-6">
              <h2 id="auth-title" className="font-display text-[26px] leading-tight text-deep">
                {mode === 'login' ? 'Sign in to Ocean AI' : 'Create your account'}
              </h2>
              <p className="mt-1.5 text-[14px] text-muted">
                {mode === 'login' ? 'Access monitoring layers and research outputs.' : 'Request access to the monitoring platform.'}
              </p>

              <div className="mt-6 space-y-4">
                {mode === 'register' && (
                  <AuthField label="Full name" error={errors.name}>
                    <input value={form.name} onChange={set('name')} autoComplete="name" className={input(errors.name)} />
                  </AuthField>
                )}
                <AuthField label="Email" error={errors.email}>
                  <input type="email" value={form.email} onChange={set('email')} autoComplete="email" className={input(errors.email)} />
                </AuthField>
                {mode === 'register' && (
                  <AuthField label="I am a…" error={errors.role}>
                    <select value={form.role} onChange={set('role')} className={input(errors.role)}>
                      <option value="">Select one</option>
                      {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </AuthField>
                )}
                <AuthField label="Password" error={errors.password}>
                  <input
                    type="password"
                    value={form.password}
                    onChange={set('password')}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className={input(errors.password)}
                  />
                </AuthField>
                {mode === 'register' && (
                  <AuthField label="Confirm password" error={errors.confirm}>
                    <input type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" className={input(errors.confirm)} />
                  </AuthField>
                )}
              </div>

              {errors.form && (
                <p role="alert" className="mt-4 rounded-[3px] border border-coral-soft bg-white px-3 py-2 text-[13.5px] text-coral">
                  {errors.form}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-7 h-11 w-full rounded-[4px] bg-deep text-[15px] font-medium text-paper transition-colors duration-150 hover:bg-deep-2 disabled:opacity-70"
              >
                {submitting ? 'Please wait…' : mode === 'login' ? 'Login' : 'Register'}
              </button>
              <p className="mt-4 text-center text-[13.5px] text-muted">
                {mode === 'login' ? 'New to Ocean AI? ' : 'Already have an account? '}
                <button
                  type="button"
                  onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')}
                  className="font-medium text-tide hover:text-deep"
                >
                  {mode === 'login' ? 'Register' : 'Login'}
                </button>
              </p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AuthField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-ink">{label}</span>
      <span className="mt-1.5 block">{children}</span>
      {error && <span className="mt-1.5 block text-[12.5px] text-coral">{error}</span>}
    </label>
  );
}

function input(error?: string) {
  return `h-11 w-full rounded-[4px] border bg-white px-3 text-[15px] text-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-tide focus:ring-2 focus:ring-tide/20 ${
    error ? 'border-coral' : 'border-line'
  }`;
}
