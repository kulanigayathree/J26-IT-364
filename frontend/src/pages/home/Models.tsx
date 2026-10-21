import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../../auth/AuthContext';
import { MODULES } from '../../modules';
import { FishingPreview } from './FishingPreview';

/** "Your models" — shown on the homepage after login. */
export function Models({ user }: { user: User }) {
  const navigate = useNavigate();
  return (
    <section id="models" className="scroll-mt-16 border-b border-line bg-paper">
      <div className="mx-auto max-w-page px-5 py-16 md:px-8 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-8">
          <div>
            <p className="font-mono text-[12px] text-tide">Signed in as {user.name}</p>
            <h2 className="mt-3 font-display text-[32px] leading-[1.1] tracking-[-0.01em] text-deep md:text-[40px]">Your models</h2>
          </div>
          <p className="max-w-[420px] text-[15px] leading-[1.7] text-muted">Choose a model to work with in Sri Lankan waters.</p>
        </div>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((m) => (
            <li
              key={m.id}
              onClick={() => navigate(m.path)}
              className="flex cursor-pointer flex-col overflow-hidden rounded-[4px] border border-line bg-white transition-colors duration-150 hover:border-tide"
            >
              <div className="aspect-[4/3] overflow-hidden bg-deep">
                {m.img ? <img src={m.img} alt="" className={`h-full w-full object-cover ${m.id === 'c4' ? 'grayscale' : ''}`} /> : <FishingPreview />}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <m.icon className="size-5 text-tide" strokeWidth={1.5} aria-hidden="true" />
                <h3 className="mt-3 font-display text-[20px] leading-[1.2] text-deep">{m.cardTitle}</h3>
                <p className="mt-2 text-[14.5px] leading-[1.6] text-muted">{m.body}</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(m.path);
                  }}
                  className="group mt-auto inline-flex items-center gap-2 pt-5 text-[14px] font-medium text-tide transition-colors duration-150 hover:text-deep"
                >
                  Open model
                  <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={1.75} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
