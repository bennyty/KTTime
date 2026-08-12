/** Formats a duration in ms as `M:SS` or `H:MM:SS`; negative values (overtime) get a leading `+`. */
export function formatDuration(ms: number): string {
  const isNegative = ms < 0;
  const totalSeconds = Math.floor(Math.abs(ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const core =
    hours > 0
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${minutes}:${String(seconds).padStart(2, '0')}`;

  return isNegative ? `+${core}` : core;
}
