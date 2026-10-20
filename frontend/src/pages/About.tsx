import { useEffect } from 'react';
import { PublicLayout } from '../components/Layouts';
import { MODULES } from '../modules';

export default function About() {
  useEffect(() => {
    document.title = 'About · Ocean AI';
  }, []);

  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm font-bold uppercase tracking-wide text-coral-text">About the project</p>
        <h1 className="mt-1 text-3xl">AI-Based Marine Monitoring and Decision Support System for Sri Lankan Waters</h1>
        <p className="mt-4 font-serif text-lg text-muted">
          A final-year research project at the Sri Lanka Institute of Information Technology (SLIIT),
          research group J26-IT-364. Four machine-learning components share one data pipeline, one API
          and this web app.
        </p>

        <h2 className="mt-10 text-2xl">Components and team</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {MODULES.map((m) => (
            <li key={m.id} className="flex gap-4 rounded border border-line bg-paper p-4">
              <m.icon aria-hidden className="h-7 w-7 shrink-0 text-coral" />
              <div>
                <h3 className="text-lg">
                  {m.id.toUpperCase()} – {m.name}
                </h3>
                <p className="font-serif text-muted">{m.description}</p>
                <p className="mt-1 text-sm">Team member: {m.owner}</p>
              </div>
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-2xl">Supervision</h2>
        <p className="mt-2 font-serif text-muted">Supervisor: (to be added) · Co-supervisor: (to be added)</p>

        <p className="mt-10 text-sm text-muted">Model outputs are research results, not official advisories.</p>
      </div>
    </PublicLayout>
  );
}
