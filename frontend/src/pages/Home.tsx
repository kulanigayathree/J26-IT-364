import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AuthDialog, type AuthMode } from '../components/AuthDialog';
import { Footer } from '../components/Footer';
import { Nav } from '../components/Nav';
import { About } from './home/About';
import { ClosingCta } from './home/ClosingCta';
import { Hero } from './home/Hero';
import { Models } from './home/Models';
import { OceanMap } from './home/OceanMap';
import { Process } from './home/Process';
import { Research } from './home/Research';
import { Users } from './home/Users';

/** Public homepage. /login and /register open the auth dialog on top of it. */
export default function Home() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const mode: AuthMode | null = location.pathname === '/login' ? 'login' : location.pathname === '/register' ? 'register' : null;
  const from = (location.state as { from?: string } | null)?.from;

  const close = useCallback(() => navigate('/'), [navigate]);
  const changeMode = (m: AuthMode) => navigate(`/${m}`, { replace: true, state: location.state });
  const done = () => navigate(from ?? '/#models', { replace: true });

  // Scroll to #section after navigating here from another page.
  useEffect(() => {
    if (!location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) window.setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [location.hash, user]);

  return (
    <>
      <Nav />
      <main>
        <Hero />
        {user && <Models user={user} />}
        <About />
        <Research />
        <OceanMap />
        <Process />
        <Users />
        <ClosingCta user={user} />
      </main>
      <Footer />
      <AuthDialog mode={mode} onModeChange={changeMode} onClose={close} onAuthenticated={done} />
    </>
  );
}
