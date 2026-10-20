import { useAuth } from '../auth/AuthContext';
import { ButtonLink } from './Button';
import { Logo } from './Logo';

/** Top bar for public pages. Buttons stay visible on phones (no menu needed). */
export function PublicNavbar() {
  const { user } = useAuth();
  return (
    <header className="bg-navy">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Logo />
        <nav className="flex shrink-0 items-center gap-2">
          {user ? (
            <ButtonLink to="/dashboard">Go to dashboard</ButtonLink>
          ) : (
            <>
              <ButtonLink to="/login" variant="light" className="px-3 sm:px-4">
                Login
              </ButtonLink>
              <ButtonLink to="/register" className="px-3 sm:px-4">
                Register
              </ButtonLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
