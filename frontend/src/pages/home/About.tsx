export function About() {
  return (
    <section id="about" className="scroll-mt-20 border-b border-line">
      <div className="mx-auto grid max-w-page gap-10 px-5 py-20 md:px-8 md:py-24 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <h2 className="font-display text-[30px] leading-[1.18] tracking-[-0.01em] text-deep md:text-[38px]">
            Sri Lanka’s ocean territory is roughly eight times the size of the island itself — and most of it is rarely observed.
          </h2>
        </div>
        <div className="space-y-5 text-[16px] leading-[1.75] text-muted lg:col-span-5 lg:col-start-8 lg:pt-2">
          <p>
            Fishing communities, reef ecosystems and one of the busiest shipping lanes in the Indian Ocean share these waters.
            Patrols and field surveys can only cover a small fraction of them at any one time.
          </p>
          <p>
            Ocean AI brings together satellite observation, vessel tracking data and machine learning in a single research
            platform, so that changes at sea can be noticed earlier and understood with more context.
          </p>
          <a
            href="#research"
            className="inline-block border-b border-tide pb-0.5 text-[15px] font-medium text-tide transition-colors duration-150 hover:border-deep hover:text-deep"
          >
            Read about the four research components
          </a>
        </div>
      </div>
    </section>
  );
}
