import { colors } from '../../theme';

export type View = 'probability' | 'uncertainty';

// Colour steps for the grid. Same steps are shown in the legend.
export const STEPS: Record<View, { limits: number[]; color: string; labels: string[]; swatches: string[] }> = {
  probability: {
    limits: [0.2, 0.4, 0.6],
    color: colors.coral,
    labels: ['Under 20%', '20–40%', '40–60%', 'Over 60%'],
    swatches: ['border-coral bg-coral/10', 'border-coral bg-coral/25', 'border-coral bg-coral/45', 'border-coral bg-coral/70'],
  },
  uncertainty: {
    limits: [0.1, 0.2, 0.3],
    color: colors.sea,
    labels: ['± under 10%', '± 10–20%', '± 20–30%', '± over 30%'],
    swatches: ['border-sea bg-sea/10', 'border-sea bg-sea/25', 'border-sea bg-sea/45', 'border-sea bg-sea/70'],
  },
};

export function ChoiceButtons<V extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-bold">{label}</legend>
      <div className="grid auto-cols-fr grid-flow-col overflow-hidden rounded border border-navy">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
            className={`h-12 border-r border-navy px-2 font-bold last:border-r-0 ${o.value === value ? 'bg-navy text-paper' : 'bg-paper text-navy hover:bg-paper-2'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

