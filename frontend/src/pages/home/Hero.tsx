import { ArrowRight } from 'lucide-react';
import { StudyAreaInset } from './StudyAreaInset';

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-abyss text-paper">
      <img
        src="/images/hero.jpg"
        alt="Aerial view of the Indian Ocean meeting Sri Lanka's southern coastline, deep water shading into turquoise reef shallows"
        className="absolute inset-0 -z-10 h-full w-full object-cover object-[70%_center]"
      />
      {/* Readability scrim: darkens only the open water behind the text */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(6,26,38,0.82)_0%,rgba(6,26,38,0.55)_40%,rgba(6,26,38,0)_72%)]"
      />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-28 bg-[linear-gradient(180deg,rgba(6,26,38,0.5),rgba(6,26,38,0))]" />

      <div className="mx-auto grid max-w-page gap-10 px-5 pb-14 pt-36 md:px-8 md:pb-16 md:pt-44 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <p className="font-mono text-[12px] text-shallow">Indian Ocean · Sri Lankan waters</p>
          <h1 className="mt-5 max-w-[620px] font-display text-[42px] font-normal leading-[1.04] tracking-[-0.015em] md:text-[60px]">
            Understanding Our Ocean.
            <br />
            <em className="font-normal text-shallow">Protecting Our Future.</em>
          </h1>
          <p className="mt-6 max-w-[520px] text-[16.5px] leading-[1.65] text-paper/85">
            An integrated marine monitoring platform using satellite imagery, vessel tracking, and machine learning to support
            marine research and sustainable fishing in Sri Lankan waters.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href="#monitoring"
              className="group inline-flex h-12 items-center gap-2.5 whitespace-nowrap rounded-[4px] bg-paper px-6 text-[15px] font-medium text-deep transition-colors duration-150 hover:bg-sand"
            >
              Explore Monitoring
              <ArrowRight className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5" strokeWidth={1.75} />
            </a>
            <a
              href="#research"
              className="inline-flex h-12 items-center whitespace-nowrap rounded-[4px] border border-paper/45 px-6 text-[15px] text-paper transition-colors duration-150 hover:border-paper hover:bg-paper/10"
            >
              Discover Our Research
            </a>
          </div>
        </div>

        <div className="lg:col-span-4 lg:col-start-9">
          <StudyAreaInset />
        </div>
      </div>

      <div className="border-t border-paper/15">
        <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-x-8 gap-y-2 px-5 py-4 font-mono text-[11.5px] text-paper/60 md:px-8">
          <span>Southern coast, Sri Lanka — aerial</span>
          <span>Satellite radar · Optical imagery · AIS vessel positions · Ocean conditions</span>
        </div>
      </div>
    </section>
  );
}
