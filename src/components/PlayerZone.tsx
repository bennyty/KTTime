import { useLongPress } from '../hooks/useLongPress';
import { formatDuration } from '../timer/format';
import type { PlayerId } from '../timer/types';

interface PlayerZoneProps {
  player: PlayerId;
  remainingMs: number;
  isActive: boolean;
  isShared: boolean;
  flipped: boolean;
  onTap: () => void;
  onLongPress: () => void;
}

type ZoneStatus = { backgroundClass: string; badge: string | null; outlineClass: string };

function zoneStatus(isTimesUp: boolean, isShared: boolean, isActive: boolean): ZoneStatus {
  if (isTimesUp && isActive) {
    return { backgroundClass: 'bg-red-900 text-red-50', badge: "Time's up (Active)", outlineClass: '' };
  }
  if (isTimesUp) {
    return {
      backgroundClass: 'bg-neutral-900 text-neutral-500',
      badge: "Time's up",
      outlineClass: 'outline outline-24 -outline-offset-24 outline-red-700',
    };
  }
  if (isShared) return { backgroundClass: 'bg-cyan-900 text-cyan-50', badge: 'Shared', outlineClass: '' };
  if (isActive) return { backgroundClass: 'bg-green-800 text-green-50', badge: 'Active', outlineClass: '' };
  return { backgroundClass: 'bg-neutral-900 text-neutral-500', badge: null, outlineClass: '' };
}

export function PlayerZone({ player, remainingMs, isActive, isShared, flipped, onTap, onLongPress }: PlayerZoneProps) {
  const { backgroundClass, badge, outlineClass } = zoneStatus(remainingMs <= 0, isShared, isActive);
  const { holding, ...longPress } = useLongPress(onTap, onLongPress);

  return (
    <div
      className={`relative flex flex-1 select-none items-center justify-center transition-colors duration-300 ${backgroundClass} ${outlineClass} ${
        holding ? 'brightness-75' : ''
      } ${flipped ? 'rotate-180' : ''}`}
    >
      <button type="button" {...longPress} className="absolute inset-0" aria-label={`Player ${player} zone`} />
      <span className="pointer-events-none absolute left-4 top-3 text-sm uppercase tracking-wider opacity-60">
        Player {player}
      </span>
      {badge && (
        <span className="pointer-events-none absolute right-4 top-3 rounded-full bg-white/15 px-2.5 py-1 text-sm uppercase tracking-wide">
          {badge}
        </span>
      )}
      <div className="pointer-events-none font-bold tabular-nums" style={{ fontSize: 'min(22vh,26vw)' }}>
        {formatDuration(remainingMs)}
      </div>
      <button
        type="button"
        onClick={onLongPress}
        aria-label={`Player ${player} menu`}
        className="absolute bottom-4 right-4 z-10 rounded-lg bg-white/15 p-2 text-neutral-100"
      >
        <MenuIcon />
      </button>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-6 w-6">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}
