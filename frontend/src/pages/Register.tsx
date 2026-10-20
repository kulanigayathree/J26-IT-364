import { useEffect, useId, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, type Role } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { AuthCard, FormField, inputClass } from '../components/FormField';

type Errors = Partial<Record<'name' | 'email' | 'password' | 'confirm' | 'form', string>>;

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';
  const roleId = useId();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: 'agency' as Role });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = 'Register · Ocean AI';
  }, []);

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (form.name.trim().length < 2) next.name = 'Enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address.';
    if (form.password.length < 8) next.password = 'Use at least 8 characters.';
    if (form.confirm !== form.password) next.confirm = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await register({ name: form.name.trim(), email: form.email, password: form.password, role: form.role });
      navigate(from, { replace: true });
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Registration failed.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Register">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormField label="Name" autoComplete="name" value={form.name} onChange={(e) => set('name')(e.target.value)} error={errors.name} />
        <FormField label="Email" type="email" autoComplete="email" value={form.email} onChange={(e) => set('email')(e.target.value)} error={errors.email} />
        <FormField
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => set('password')(e.target.value)}
          error={errors.password}
        />
        <FormField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={(e) => set('confirm')(e.target.value)}
          error={errors.confirm}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor={roleId} className="text-sm font-bold">
            I am a
          </label>
          <select id={roleId} value={form.role} onChange={(e) => set('role')(e.target.value)} className={inputClass}>
            <option value="agency">Agency user</option>
            <option value="fisher">Fisher</option>
          </select>
        </div>
        {errors.form && (
          <p role="alert" className="rounded border border-coral-text px-3 py-2 text-sm text-coral-text">
            {errors.form}
          </p>
        )}
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? 'Creating account…' : 'Register'}
        </Button>
      </form>
      <p className="mt-4 text-sm">
        Already registered?{' '}
        <Link to="/login" state={location.state} className="font-bold text-sea underline">
          Login
        </Link>
      </p>
      <p className="mt-2 text-sm">
        <Link to="/" className="text-sea underline">
          Back to home
        </Link>
      </p>
    </AuthCard>
  );
}
