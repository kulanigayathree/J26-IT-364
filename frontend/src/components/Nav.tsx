import { useEffect, useState, type MouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Logo } from './Logo';

const LINKS = [
  { label: 'Home', hash: '#top' },
  { label: 'Monitoring', hash: '#monitoring' },
  { label: 'Research', hash: '#research' },
  { label: 'About', hash: '#about' },
];

/** Top bar. Transparent over the homepage hero, solid after scrolling and on model pages. */
export function Nav({ forceSolid = false }: { forceSolid?: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const light = !solid && !open && !forceSolid;

  /** Section links work from every page: go home first, then scroll. */
  const go = (e: MouseEvent, hash: string) => {
    e.preventDefault();
    setOpen(false);
    if (pathname !== '/') {
      navigate(`/${hash === '#top' ? '' : hash}`);
      return;
    }
    if (hash === '#top') window.scrollTo({ top: 0, behavior: 'smooth' });
    else document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const auth = (mode: 'login' | 'register') => {
    setOpen(false);
    navigate(`/${mode}`);
  };
  const signOut = () => {
    setOpen(false);
    navigate('/', { replace: true });
    logout();
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color,color] duration-200 ease-soft ${
        light ? 'border-paper/15 bg-transparent text-paper' : 'border-line bg-paper text-ink'
      }`}
    >
      <div className="mx-auto flex h-[68px] max-w-page items-center justify-between px-5 md:px-8">
        <a href="/" aria-label="Ocean AI home" onClick={(e) => go(e, '#top')}>
          <Logo tone={light ? 'light' : 'dark'} />
        </a>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={`/${l.hash}`}
              onClick={(e) => go(e, l.hash)}
              className={`whitespace-nowrap text-[14px] transition-colors duration-150 ${light ? 'text-paper/80 hover:text-paper' : 'text-muted hover:text-ink'}`}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <span className={`whitespace-nowrap text-[14px] ${light ? 'text-paper/85' : 'text-muted'}`}>{user.name}</span>
              <button
                type="button"
                onClick={signOut}
                className={`h-9 whitespace-nowrap rounded-[4px] border px-4 text-[14px] transition-colors duration-150 ${
                  light ? 'border-paper/40 hover:bg-paper/10' : 'border-line hover:bg-sand'
                }`}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => auth('login')}
                className={`h-9 whitespace-nowrap px-3 text-[14px] transition-colors duration-150 ${light ? 'text-paper/85 hover:text-paper' : 'text-muted hover:text-ink'}`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => auth('register')}
                className={`h-9 whitespace-nowrap rounded-[4px] px-4 text-[14px] font-medium transition-colors duration-150 ${
                  light ? 'bg-paper text-deep hover:bg-sand' : 'bg-deep text-paper hover:bg-deep-2'
                }`}
              >
                Register
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          className="-mr-2 flex size-10 items-center justify-center md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-5" strokeWidth={1.5} /> : <Menu className="size-5" strokeWidth={1.5} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="border-t border-line bg-paper px-5 pb-6 md:hidden"
          >
            <nav className="flex flex-col" aria-label="Mobile">
              {LINKS.map((l) => (
                <a key={l.label} href={`/${l.hash}`} onClick={(e) => go(e, l.hash)} className="border-b border-line py-3.5 font-display text-[20px] text-ink">
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {user ? (
                <button type="button" onClick={signOut} className="col-span-2 h-11 rounded-[4px] border border-line text-[15px] text-ink">
                  Sign out ({user.name})
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => auth('login')} className="h-11 rounded-[4px] border border-line text-[15px] text-ink">
                    Login
                  </button>
                  <button type="button" onClick={() => auth('register')} className="h-11 rounded-[4px] bg-deep text-[15px] font-medium text-paper">
                    Register
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
