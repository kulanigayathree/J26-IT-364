import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { AuthCard, FormField } from '../components/FormField';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = 'Login · Ocean AI';
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Login failed.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Login">
      {from !== '/dashboard' && <p className="mb-4 text-sm text-muted">Please log in to see this page.</p>}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <FormField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        {errors.form && (
          <p role="alert" className="rounded border border-coral-text px-3 py-2 text-sm text-coral-text">
            {errors.form}
          </p>
        )}
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? 'Logging in…' : 'Login'}
        </Button>
      </form>
      <p className="mt-4 text-sm">
        No account?{' '}
        <Link to="/register" state={location.state} className="font-bold text-sea underline">
          Register
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
