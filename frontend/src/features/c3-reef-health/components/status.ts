import type { BadgeTone } from '@/components/ui';
import type { ColorToken, Severity } from '@/design/tokens';
import type { ReefStatus } from '../types';

export const reefStatus: Record<
  ReefStatus,
  { label: string; tone: BadgeTone; color: ColorToken; severity: Severity }
> = {
  healthy: { label: 'Healthy', tone: 'positive', color: 'reef-green', severity: 'low' },
  watch: { label: 'Watch', tone: 'warning', color: 'amber', severity: 'medium' },
  degraded: { label: 'Degraded', tone: 'accent', color: 'coral-text', severity: 'high' },
};
