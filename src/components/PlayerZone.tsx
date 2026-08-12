import { formatDuration } from '../timer/format';
import type { PlayerId } from '../timer/types';

interface PlayerZoneProps {
  player: PlayerId;
  remainingMs: number;
  isActive: boolean;
  isShared: boolean;
  flipped: boolean;
  onTap: () => void;
}

type ZoneStatus = { backgroundClass: string; badge: string | null };

function zoneStatus(isTimesUp: boolean, isShared: boolean, isActive: boolean): ZoneStatus {
  if (isTimesUp) return { backgroundClass: 'bg-red-900 text-red-50', badge: "Time's up" };
  if (isShared) return { backgroundClass: 'bg-cyan-900 text-cyan-50', badge: 'Shared' };
  if (isActive) return { backgroundClass: 'bg-green-800 text-green-50', badge: 'Active' };
  return { backgroundClass: 'bg-neutral-900 text-neutral-500', badge: null };
}

export function PlayerZone({ player, remainingMs, isActive, isShared, flipped, onTap }: PlayerZoneProps) {
  const { backgroundClass, badge } = zoneStatus(remainingMs <= 0, isShared, isActive);

  return (
    <button
      type="button"
      onClick={onTap}
      className={`relative flex flex-1 select-none items-center justify-center transition-colors duration-300 ${backgroundClass} ${
        flipped ? 'rotate-180' : ''
      }`}
    >
      <span className="absolute left-4 top-3 text-xs uppercase tracking-wider opacity-60">Player {player}</span>
      {badge && (
        <span className="absolute right-4 top-3 rounded-full bg-white/15 px-2.5 py-1 text-xs uppercase tracking-wide">
          {badge}
        </span>
      )}
      <span className="font-bold tabular-nums" style={{ fontSize: '15vw' }}>
        {formatDuration(remainingMs)}
      </span>
    </button>
  );
}
