/** Small legend shown under a map. Colours come from theme.ts; labels carry the meaning. */
export function MapLegend({ items }: { items: { label: string; swatch: string }[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span aria-hidden className={`inline-block h-3 w-3 rounded-full border ${item.swatch}`} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
