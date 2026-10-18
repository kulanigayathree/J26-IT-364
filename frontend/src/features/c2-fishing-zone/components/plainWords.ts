import type { BadgeTone } from '@/components/ui';
import type { Confidence } from '../types';

/** Confidence in words a fisher can act on. */
export const confidenceWords: Record<
  Confidence,
  { short: string; sentence: string; tone: BadgeTone }
> = {
  high: {
    short: 'Good chance',
    sentence: 'The forecast is fairly sure about this zone.',
    tone: 'positive',
  },
  medium: {
    short: 'Some chance',
    sentence: 'Conditions may change. Check again before you leave.',
    tone: 'warning',
  },
  low: {
    short: 'Uncertain',
    sentence: 'The forecast is not sure. Treat this zone as a rough guide only.',
    tone: 'accent',
  },
};

const directionNames: Record<string, string> = {
  N: 'north',
  NE: 'north-east',
  E: 'east',
  SE: 'south-east',
  S: 'south',
  SW: 'south-west',
  W: 'west',
  NW: 'north-west',
};

export function directionWords(code: string): string {
  return directionNames[code] ?? code;
}
