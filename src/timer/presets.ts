/** Locked in KTTime issue #4: total combined game time, split 50/50 by default. */
export interface TimeControlPreset {
  label: string;
  totalMs: number;
}

const HOUR = 60 * 60 * 1000;

export const TIME_CONTROL_PRESETS: TimeControlPreset[] = [
  { label: '2 hours', totalMs: 2 * HOUR },
  { label: '3 hours', totalMs: 3 * HOUR },
  { label: '4 hours', totalMs: 4 * HOUR },
  { label: '5 hours', totalMs: 5 * HOUR },
];

export const DEFAULT_PRESET = TIME_CONTROL_PRESETS[0];

export function evenSplit(totalMs: number): { A: number; B: number } {
  return { A: totalMs / 2, B: totalMs / 2 };
}
