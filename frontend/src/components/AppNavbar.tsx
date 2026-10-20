import { useState } from 'react';
import { LogOut, Menu, UserRound, X } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Logo } from './Logo';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/c1', label: 'C1' },
  { to: '/c2', label: 'C2' },
  { to: '/c3', label: 'C3' },
  { to: '/c4', label: 'C4' },
  { to: '/about', label: 'About' },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded px-3 py-2 font-bold ${isActive ? 'bg-navy-deep text-paper underline decoration-coral decoration-2 underline-offset-4' : 'text-line hover:text-paper'}`;

/** Top bar for logged-in pages. Becomes a hamburger menu below 1024px. */
export function AppNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Leave the protected page first, so it doesn't redirect to /login when the user is cleared.
  const onLogout = () => {
    navigate('/', { replace: true });
    logout();
  };

  return (
    <header className="bg-navy">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Logo to="/dashboard" />

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <span className="flex items-center gap-1 text-sm text-line">
            <UserRound aria-hidden className="h-4 w-4" />
            {user?.name}
          </span>
          <button type="button" onClick={onLogout} className="flex items-center gap-1 rounded border border-paper px-3 py-1.5 text-sm font-bold text-paper hover:bg-navy-deep">
            <LogOut aria-hidden className="h-4 w-4" /> Logout
          </button>
        </div>

        <button
          type="button"
          className="rounded p-2 text-paper hover:bg-navy-deep lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="Main" className="border-t border-navy-deep px-4 pb-4 lg:hidden">
          <ul className="flex flex-col gap-1 pt-2">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to} className={linkClass} onClick={() => setOpen(false)}>
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-navy-deep pt-3">
            <span className="text-sm text-line">{user?.name}</span>
            <button type="button" onClick={onLogout} className="flex items-center gap-1 rounded border border-paper px-3 py-2 font-bold text-paper">
              <LogOut aria-hidden className="h-4 w-4" /> Logout
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
