import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, getToken, LOGGED_OUT_EVENT, setToken } from '../api/client';
import { Loading } from '../components/ui';

export type Role = 'agency' | 'researcher' | 'fisheries_officer' | 'conservation' | 'fisher' | 'other';

export const ROLE_LABELS: Record<Role, string> = {
  agency: 'Marine agency',
  researcher: 'Researcher',
  fisheries_officer: 'Fisheries officer',
  conservation: 'Conservation team',
  fisher: 'Fisher',
  other: 'Other',
};

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

interface TokenResponse {
  access_token: string;
  user: User;
}

interface AuthValue {
  user: User | null;
  /** false until we know whether a saved login is still valid */
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; role: Role }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // Restore a saved login on page load.
  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    api<User>('/api/auth/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  // The API rejected our token (expired): forget the user.
  useEffect(() => {
    const onLoggedOut = () => setUser(null);
    window.addEventListener(LOGGED_OUT_EVENT, onLoggedOut);
    return () => window.removeEventListener(LOGGED_OUT_EVENT, onLoggedOut);
  }, []);

  const finish = (res: TokenResponse) => {
    setToken(res.access_token);
    setUser(res.user);
  };

  const login = useCallback(async (email: string, password: string) => {
    finish(await api<TokenResponse>('/api/auth/login', { method: 'POST', body: { email, password } }));
  }, []);

  const register = useCallback(
    async (data: { name: string; email: string; password: string; role: Role }) => {
      finish(await api<TokenResponse>('/api/auth/register', { method: 'POST', body: data }));
    },
    [],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

/** Wrap pages that need a login. Sends visitors to /login and back here afterwards. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}
