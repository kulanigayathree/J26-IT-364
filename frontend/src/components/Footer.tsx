import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Logo } from './Logo';

export function Footer() {
  const { user } = useAuth();
  const link = 'text-[14px] text-paper/70 transition-colors duration-150 hover:text-paper';
  return (
    <footer className="bg-abyss text-paper">
      <div className="mx-auto grid max-w-page gap-10 px-5 py-14 md:px-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Logo tone="light" />
          <p className="mt-5 max-w-[360px] text-[14px] leading-[1.7] text-paper/60">
            A marine monitoring research platform for Sri Lankan waters, combining satellite imagery, vessel tracking and machine
            learning. Model outputs are research results, not official advisories.
          </p>
        </div>

        <nav className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-6 lg:col-start-7" aria-label="Footer">
          <div>
            <p className="font-mono text-[11.5px] text-shallow">Platform</p>
            <ul className="mt-4 space-y-2.5">
              <li><a href="/#top" className={link}>Home</a></li>
              <li><a href="/#monitoring" className={link}>Monitoring</a></li>
              <li><a href="/#research" className={link}>Research</a></li>
            </ul>
          </div>
          <div>
            <p className="font-mono text-[11.5px] text-shallow">Project</p>
            <ul className="mt-4 space-y-2.5">
              <li><a href="/#about" className={link}>About</a></li>
              <li><a href="/#research" className={link}>Components</a></li>
            </ul>
          </div>
          <div>
            <p className="font-mono text-[11.5px] text-shallow">Account</p>
            <ul className="mt-4 space-y-2.5">
              {user ? (
                <li><a href="/#models" className={link}>Your models</a></li>
              ) : (
                <>
                  <li><Link to="/login" className={link}>Login</Link></li>
                  <li><Link to="/register" className={link}>Register</Link></li>
                </>
              )}
            </ul>
          </div>
        </nav>
      </div>
      <div className="border-t border-paper/10">
        <div className="mx-auto flex max-w-page flex-wrap justify-between gap-3 px-5 py-5 text-[12.5px] text-paper/45 md:px-8">
          <span>© 2026 Ocean AI · SLIIT research group J26-IT-364</span>
          <span>Sri Lanka · Indian Ocean</span>
        </div>
      </div>
    </footer>
  );
}
