import { useEffect, type ReactNode } from 'react';
import { getC1Summary } from '../api/c1';
import { getC2Summary } from '../api/c2';
import { getC3Summary } from '../api/c3';
import { getC4Summary } from '../api/c4';
import { useApi } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Tile } from '../components/Tile';
import { percent } from '../format';
import { MODULES, type ModuleInfo } from '../modules';

/** The key number for each tile, from that component's /summary endpoint. */
function useKeyNumbers(): Record<ModuleInfo['id'], ReactNode> {
  const c1 = useApi(getC1Summary, []);
  const c2 = useApi(getC2Summary, []);
  const c3 = useApi(getC3Summary, []);
  const c4 = useApi(getC4Summary, []);

  const show = <T,>(s: { data: T | null; error: string | null }, text: (d: T) => string): ReactNode =>
    s.error ? <span className="text-base text-coral-text">Not available</span> : s.data ? text(s.data) : <span className="text-base text-muted">Loading…</span>;

  return {
    c1: show(c1, (d) => `${d.anomalies_today} anomalies today`),
    c2: show(c2, (d) => `Best zone ${percent(d.best_probability)} likely`),
    c3: show(c3, (d) => `${d.at_risk} ${d.at_risk === 1 ? 'reef' : 'reefs'} at risk`),
    c4: show(c4, (d) => `${d.active} active ${d.active === 1 ? 'spill' : 'spills'}`),
  };
}

export default function Dashboard() {
  const { user } = useAuth();
  const numbers = useKeyNumbers();

  useEffect(() => {
    document.title = 'Dashboard · Ocean AI';
  }, []);

  return (
    <>
      <h1 className="text-2xl">Welcome, {user?.name}</h1>
      <p className="mt-1 font-serif text-muted">
        Latest results from the four AI models monitoring Sri Lankan waters. Open a tile for maps and details.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {MODULES.map((m) => (
          <Tile
            key={m.id}
            to={m.path}
            icon={m.icon}
            title={`${m.id.toUpperCase()} · ${m.name}`}
            description={m.description}
            keyNumber={numbers[m.id]}
            owner={m.owner}
          />
        ))}
      </div>
    </>
  );
}
