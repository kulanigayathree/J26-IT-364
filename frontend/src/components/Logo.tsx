/** Wordmark: three bathymetric contour lines beside a serif name. */
export function Logo({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const ink = tone === 'light' ? 'text-paper' : 'text-deep';
  return (
    <span className={`flex items-center gap-2.5 ${ink}`}>
      <svg viewBox="0 0 28 28" className="size-7" aria-hidden="true" fill="none">
        <rect x="0.75" y="0.75" width="26.5" height="26.5" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 10.5c3-2 6 2 9 0s6-2 9 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5 15c3-2 6 2 9 0s6-2 9 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        <path d="M5 19.5c3-2 6 2 9 0s6-2 9 0" stroke="#d0603f" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="font-display text-[21px] font-medium leading-none tracking-[-0.01em]">
        Ocean<span className="ml-1 align-[3px] font-body text-[13px] font-semibold tracking-[0.04em]">AI</span>
      </span>
    </span>
  );
}
