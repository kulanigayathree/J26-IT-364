const STEPS = [
  {
    title: 'Observe',
    body: 'Satellite radar and optical imagery, vessel position reports and ocean condition data are gathered for Sri Lankan waters.',
    detail: 'Radar · Optical · AIS · SST · Chlorophyll',
  },
  {
    title: 'Analyze',
    body: 'Machine learning models look for patterns: unusual vessel behaviour, likely fishing grounds, reef change and possible spills.',
    detail: 'Classification · Prediction · Change detection',
  },
  {
    title: 'Understand',
    body: 'Results are presented as maps, flagged events and summaries that researchers and agencies can review and act on.',
    detail: 'Maps · Review queues · Reports',
  },
];

export function Process() {
  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-page gap-12 px-5 py-20 md:px-8 md:py-24 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 className="font-display text-[34px] leading-[1.1] tracking-[-0.01em] text-deep md:text-[40px]">How it works</h2>
          <p className="mt-4 max-w-[340px] text-[16px] leading-[1.7] text-muted">From raw observation to something a person can act on, in three stages.</p>
        </div>
        <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8 lg:col-span-8">
          <span aria-hidden="true" className="absolute left-0 right-0 top-[5px] hidden h-px bg-line md:block" />
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative flex flex-col border-l border-line pl-5 md:border-l-0 md:pl-0">
              <span aria-hidden="true" className={`absolute -left-[5px] top-[1px] size-[9px] md:left-0 ${i === 2 ? 'bg-coral' : 'bg-tide'}`} />
              <span className="font-mono text-[12px] text-muted md:mt-8">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-2 font-display text-[26px] leading-[1.15] text-deep">{s.title}</h3>
              <p className="mt-3 text-[15px] leading-[1.7] text-muted">{s.body}</p>
              <p className="mt-auto pt-5 font-mono text-[11.5px] leading-[1.6] text-tide">{s.detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
