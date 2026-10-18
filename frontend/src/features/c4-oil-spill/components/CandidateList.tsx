import { CircleHelp } from 'lucide-react';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { CandidateVessel } from '../types';

export interface CandidateListProps {
  candidates: CandidateVessel[];
  selectedMmsi: string | null;
  onSelect: (mmsi: string) => void;
}

/** Ranked candidate vessels. Every item says "Candidate, not proof". */
export function CandidateList({ candidates, selectedMmsi, onSelect }: CandidateListProps) {
  return (
    <ol className="flex flex-col gap-3">
      {[...candidates]
        .sort((a, b) => a.rank - b.rank)
        .map((c) => {
          const selected = c.mmsi === selectedMmsi;
          return (
            <li
              key={c.mmsi}
              className={cn(
                'rounded border border-line bg-paper',
                selected && 'border-l-4 border-l-coral bg-paper-2',
              )}
            >
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(c.mmsi)}
                className="flex w-full items-start gap-3 p-4 text-left"
              >
                <span
                  aria-label={`Rank ${c.rank}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-paper"
                >
                  {c.rank}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-navy">{c.vessel_name}</span>
                    <Badge tone="warning" icon={CircleHelp}>
                      Candidate, not proof
                    </Badge>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">
                    {c.vessel_type} · {c.flag} · MMSI {c.mmsi} · score {c.score.toFixed(2)}
                  </span>
                  <ul className="mt-2 flex flex-col gap-1 text-sm">
                    {c.evidence.map((e) => (
                      <li key={e.kind} className="flex flex-col sm:flex-row sm:gap-2">
                        <span className="shrink-0 font-bold sm:w-40">{e.label}</span>
                        <span className="font-serif">{e.value}</span>
                      </li>
                    ))}
                  </ul>
                </span>
              </button>
            </li>
          );
        })}
    </ol>
  );
}
