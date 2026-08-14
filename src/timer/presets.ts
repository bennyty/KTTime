/** Locked in KTTime issue #4: total combined game time, split 50/50 by default. */
export interface TimeControlPreset {
  label: string;
  totalMs: number;
}

const HOUR_MS = 60 * 60 * 1000;

export const TIME_CONTROL_PRESETS: TimeControlPreset[] = [
  { label: '2 hours', totalMs: 2 * HOUR_MS },
  { label: '3 hours', totalMs: 3 * HOUR_MS },
  { label: '4 hours', totalMs: 4 * HOUR_MS },
];

export const DEFAULT_PRESET = TIME_CONTROL_PRESETS[0];

export function evenSplit(totalMs: number): { A: number; B: number } {
  return { A: totalMs / 2, B: totalMs / 2 };
}
