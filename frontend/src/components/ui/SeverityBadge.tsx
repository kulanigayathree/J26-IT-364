import { CircleAlert, OctagonAlert, TriangleAlert, type LucideIcon } from 'lucide-react';
import { severity as severityTokens, type Severity } from '@/design/tokens';
import { Badge, type BadgeTone } from './Badge';

const look: Record<Severity, { tone: BadgeTone; icon: LucideIcon }> = {
  low: { tone: 'positive', icon: CircleAlert },
  medium: { tone: 'warning', icon: TriangleAlert },
  high: { tone: 'accent', icon: OctagonAlert },
};

export interface SeverityBadgeProps {
  level: Severity;
  /** Show "High severity" instead of "High". */
  long?: boolean;
  className?: string;
}

/** Severity is shown with a word and an icon shape, never colour alone. */
export function SeverityBadge({ level, long, className }: SeverityBadgeProps) {
  const { tone, icon } = look[level];
  const label = severityTokens[level].label;
  return (
    <Badge tone={tone} icon={icon} className={className}>
      {long ? (
        `${label} severity`
      ) : (
        <>
          {label}
          <span className="sr-only"> severity</span>
        </>
      )}
    </Badge>
  );
}
