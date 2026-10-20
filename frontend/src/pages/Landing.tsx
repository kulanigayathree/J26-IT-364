import { useEffect } from 'react';
import { Bell, Building2, Cpu, Fish, Map as MapIcon, Satellite, Ship } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ButtonLink } from '../components/Button';
import { InfoCard } from '../components/InfoCard';
import { PublicLayout } from '../components/Layouts';
import { MapView } from '../components/MapView';
import { MODULES } from '../modules';

const steps = [
  { icon: Satellite, title: 'Satellite & vessel data', text: 'Sentinel-1 radar, Sentinel-2 images, AIS vessel tracks and ocean data.' },
  { icon: Cpu, title: 'AI models', text: 'Four models find anomalies, forecast fishing zones, track reef health and detect oil spills.' },
  { icon: MapIcon, title: 'Maps, alerts and forecasts', text: 'Results are shown on maps, tables and simple forecasts for each user.' },
];

export default function Landing() {
  const { user } = useAuth();
  useEffect(() => {
    document.title = 'Ocean AI – Marine Monitoring';
  }, []);

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="bg-navy text-paper">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-2 lg:items-center lg:py-16">
          <div>
            <h1 className="text-3xl leading-tight text-paper md:text-4xl">
              AI-Based Marine Monitoring and Decision Support System for Sri Lankan Waters
            </h1>
            <p className="mt-4 max-w-xl font-serif text-lg text-line">
              We use satellite images, vessel tracking and AI to spot unusual vessels, forecast good fishing
              zones, watch reef health and detect oil spills around Sri Lanka.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {user ? (
                <ButtonLink to="/dashboard" size="lg">
                  Go to dashboard
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink to="/register" size="lg">
                    Get started
                  </ButtonLink>
                  <ButtonLink to="/login" variant="light" size="lg">
                    Login
                  </ButtonLink>
                </>
              )}
            </div>
          </div>
          <div aria-hidden className="rounded border border-navy-deep">
            <MapView label="Map of Sri Lankan waters" height="sm" zoom={6} interactive={false} />
          </div>
        </div>
      </section>

      {/* What the system does */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl">What the system does</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((m) => (
            <InfoCard key={m.id} icon={m.icon} title={`${m.id.toUpperCase()} · ${m.short}`} text={m.description} />
          ))}
        </div>
      </section>

      {/* Who it is for */}
      <section className="bg-paper-2">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl">Who it is for</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded border border-line bg-paper p-5">
              <Building2 aria-hidden className="h-7 w-7 text-sea" />
              <h3 className="mt-3 text-lg">Agencies and researchers</h3>
              <p className="mt-1 font-serif text-muted">
                A full map dashboard with vessel anomalies, reef health, oil-spill alerts and candidate
                vessels, for the Navy, Coast Guard, MEPA, NARA and researchers.
              </p>
            </div>
            <div className="rounded border border-line bg-paper p-5">
              <Fish aria-hidden className="h-7 w-7 text-sea" />
              <h3 className="mt-3 text-lg">Fishers</h3>
              <p className="mt-1 font-serif text-muted">
                A simple phone view of good fishing zones for the next three days, with the distance and
                fuel needed from your harbour.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl">How it works</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded border border-line bg-paper p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy font-bold text-paper">
                  {i + 1}
                </span>
                <s.icon aria-hidden className="h-6 w-6 text-coral" />
              </div>
              <h3 className="mt-3 text-lg">{s.title}</h3>
              <p className="mt-1 font-serif text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 flex items-center gap-2 text-sm text-muted">
          <Ship aria-hidden className="h-4 w-4" />
          <Bell aria-hidden className="h-4 w-4" />
          Log in to see live maps, alerts and forecasts.
        </p>
      </section>
    </PublicLayout>
  );
}
