const USERS = [
  { who: 'Marine agencies', use: 'Situational awareness across the EEZ, and earlier notice of events that need a response.' },
  { who: 'Researchers', use: 'Consistent, long-running observations for studying change in Sri Lankan waters.' },
  { who: 'Fisheries officers', use: 'Context on vessel activity and fishing pressure to guide inspections and management.' },
  { who: 'Conservation teams', use: 'Reef condition over time and warning of threats such as pollution near sensitive sites.' },
  { who: 'Fishers', use: 'Guidance on where conditions are likely to suit fishing, helping to save time and fuel.' },
];

export function Users() {
  return (
    <section>
      <div className="mx-auto grid max-w-page gap-10 px-5 py-20 md:px-8 md:py-24 lg:grid-cols-12 lg:gap-14">
        <figure className="lg:col-span-6">
          <img
            src="/images/harbour.jpg"
            alt="Fishers sorting nets on brightly painted boats in a Sri Lankan harbour at dawn"
            className="aspect-[4/3] w-full rounded-[3px] object-cover lg:aspect-auto lg:h-full"
          />
        </figure>
        <div className="lg:col-span-6">
          <h2 className="font-display text-[34px] leading-[1.1] tracking-[-0.01em] text-deep md:text-[40px]">Built for the people who work with the sea</h2>
          <p className="mt-4 max-w-[480px] text-[16px] leading-[1.7] text-muted">
            The same observations serve different decisions — from national monitoring to a single morning’s trip.
          </p>
          <dl className="mt-9 border-t border-line">
            {USERS.map((u) => (
              <div key={u.who} className="grid gap-1 border-b border-line py-4 sm:grid-cols-[180px_1fr] sm:gap-6">
                <dt className="font-display text-[19px] leading-[1.4] text-deep">{u.who}</dt>
                <dd className="text-[15px] leading-[1.6] text-muted">{u.use}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
