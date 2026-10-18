import type { BadgeTone } from '@/components/ui';
import type { SpillStatus } from '../types';

export const spillStatus: Record<SpillStatus, { label: string; tone: BadgeTone }> = {
  new: { label: 'New', tone: 'solid' },
  under_review: { label: 'Under review', tone: 'info' },
  confirmed: { label: 'Confirmed', tone: 'accent' },
  dismissed: { label: 'Dismissed', tone: 'neutral' },
};
