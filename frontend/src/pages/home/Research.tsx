import { Droplets, Fish, Shell, Ship } from 'lucide-react';
import { FishingPreview } from './FishingPreview';

function Spec({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="grid grid-cols-[104px_1fr] gap-4 border-b border-line py-3">
      <dt className="font-mono text-[12px] leading-[1.6] text-tide">{term}</dt>
      <dd className="text-[14.5px] leading-[1.55] text-ink/80">{detail}</dd>
    </div>
  );
}

const STAGES = [
  { title: 'Detect', body: 'Find dark, smooth patches in satellite radar imagery that may indicate oil on the surface.' },
  { title: 'Distinguish', body: 'Separate likely spills from look-alikes such as low-wind areas, rain cells and natural films.' },
  { title: 'Estimate drift', body: 'Project where a confirmed slick is likely to move using wind and current conditions.' },
  { title: 'Rank vessels', body: 'Compare nearby vessel tracks to rank candidates for further investigation.' },
];

export function Research() {
  return (
    <section id="research" className="scroll-mt-20">
      <div className="mx-auto max-w-page px-5 pt-20 md:px-8 md:pt-24">
        <div className="grid gap-6 border-b border-line pb-10 lg:grid-cols-12 lg:items-end">
          <h2 className="font-display text-[34px] leading-[1.1] tracking-[-0.01em] text-deep md:text-[44px] lg:col-span-6">Research components</h2>
          <p className="max-w-[460px] text-[16px] leading-[1.7] text-muted lg:col-span-5 lg:col-start-8">
            Four connected lines of work, each answering a practical question about what is happening in Sri Lankan waters — and
            each designed to support, not replace, expert judgement.
          </p>
        </div>

        {/* C1 */}
        <article className="grid gap-8 border-b border-line py-14 md:py-16 lg:grid-cols-12 lg:gap-12">
          <figure className="lg:col-span-7">
            <img
              src="/images/vessel.jpg"
              alt="Aerial view of a fishing trawler crossing deep blue water, leaving a long white wake"
              className="aspect-[16/10] w-full rounded-[3px] object-cover"
            />
            <figcaption className="mt-3 font-mono text-[11.5px] text-muted">
              Vessel tracks are reconstructed from AIS position reports and compared against expected patterns.
            </figcaption>
          </figure>
          <div className="flex flex-col lg:col-span-5 lg:pt-4">
            <Ship className="size-6 text-tide" strokeWidth={1.5} aria-hidden="true" />
            <h3 className="mt-5 font-display text-[28px] leading-[1.15] text-deep md:text-[32px]">Vessel Behaviour Monitoring</h3>
            <p className="mt-4 max-w-[440px] text-[16px] leading-[1.7] text-muted">Identify unusual vessel movements and potentially suspicious activities.</p>
            <dl className="mt-8 border-t border-line">
              <Spec term="Looks at" detail="Position, speed, heading and gaps in transmission" />
              <Spec term="Highlights" detail="Loitering, abrupt course changes and activity in restricted areas" />
              <Spec term="Result" detail="Flagged tracks for review by an analyst — never an automatic verdict" />
            </dl>
          </div>
        </article>

        {/* C2 + C3 */}
        <div className="grid border-b border-line md:grid-cols-2 md:divide-x md:divide-line">
          <article className="flex flex-col py-14 md:py-16 md:pr-10 lg:pr-14">
            <div className="aspect-[4/3] overflow-hidden rounded-[3px] bg-deep">
              <FishingPreview />
            </div>
            <Fish className="mt-8 size-6 text-tide" strokeWidth={1.5} aria-hidden="true" />
            <h3 className="mt-4 font-display text-[26px] leading-[1.15] text-deep">Fishing Zone Prediction</h3>
            <p className="mt-3 max-w-[420px] text-[16px] leading-[1.7] text-muted">Estimate suitable fishing areas using oceanographic conditions.</p>
            <p className="mt-auto pt-6 font-mono text-[12px] text-muted">Sea surface temperature · Chlorophyll-a · Currents · Depth</p>
          </article>
          <article className="flex flex-col border-t border-line py-14 md:border-t-0 md:py-16 md:pl-10 lg:pl-14">
            <img
              src="/images/reef.jpg"
              alt="Shallow coral reef with branching and table corals, some showing pale bleached patches"
              className="aspect-[4/3] w-full rounded-[3px] object-cover"
            />
            <Shell className="mt-8 size-6 text-tide" strokeWidth={1.5} aria-hidden="true" />
            <h3 className="mt-4 font-display text-[26px] leading-[1.15] text-deep">Coral Reef Health</h3>
            <p className="mt-3 max-w-[420px] text-[16px] leading-[1.7] text-muted">Monitor reef conditions using satellite imagery.</p>
            <p className="mt-auto pt-6 font-mono text-[12px] text-muted">Multispectral imagery · Water clarity · Thermal stress</p>
          </article>
        </div>
      </div>

      {/* C4 */}
      <article className="bg-deep text-paper">
        <div className="mx-auto grid max-w-page gap-10 px-5 py-16 md:px-8 md:py-20 lg:grid-cols-12 lg:gap-12">
          <figure className="lg:col-span-6">
            <img
              src="/images/sar.jpg"
              alt="Grayscale satellite radar image of the sea surface, with a long dark slick trailing from a bright point"
              className="aspect-[4/3] w-full rounded-[3px] object-cover grayscale"
            />
            <figcaption className="mt-3 font-mono text-[11.5px] text-paper/55">Example radar scene: a dark slick trailing from a bright vessel return.</figcaption>
          </figure>
          <div className="lg:col-span-6 lg:pt-2">
            <Droplets className="size-6 text-shallow" strokeWidth={1.5} aria-hidden="true" />
            <h3 className="mt-5 font-display text-[30px] leading-[1.15] md:text-[36px]">Oil Spill Detection</h3>
            <p className="mt-4 max-w-[500px] text-[16px] leading-[1.7] text-paper/75">
              Detect potential spills in radar imagery, distinguish them from look-alikes, estimate drift, and rank candidate vessels
              for further investigation.
            </p>
            <ol className="mt-9 border-t border-paper/15">
              {STAGES.map((s, i) => (
                <li key={s.title} className="grid grid-cols-[36px_1fr] gap-x-3 border-b border-paper/15 py-4 sm:grid-cols-[36px_150px_1fr]">
                  <span className="font-mono text-[12px] leading-[1.9] text-coral-soft">{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-display text-[19px] leading-[1.35]">{s.title}</span>
                  <span className="col-start-2 mt-1 text-[14.5px] leading-[1.6] text-paper/70 sm:col-start-3 sm:mt-0">{s.body}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </article>
    </section>
  );
}
