import { describe, expect, it } from 'vitest';
import { formatDuration } from './format';

describe('formatDuration', () => {
  it('formats sub-hour durations as M:SS', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(5_000)).toBe('0:05');
    expect(formatDuration(65_000)).toBe('1:05');
  });

  it('formats durations over an hour as H:MM:SS', () => {
    expect(formatDuration(60 * 60_000 + 5_000)).toBe('1:00:05');
    expect(formatDuration(2 * 60 * 60_000 + 3 * 60_000 + 4_000)).toBe('2:03:04');
  });

  it('formats negative durations (overtime) with a leading +, no floor', () => {
    expect(formatDuration(-5_000)).toBe('+0:05');
    expect(formatDuration(-(60 * 60_000 + 1_000))).toBe('+1:00:01');
  });

  it('truncates sub-second remainders rather than rounding up', () => {
    expect(formatDuration(1_999)).toBe('0:01');
  });
});
