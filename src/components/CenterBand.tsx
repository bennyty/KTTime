import type { ActivationPhase, OperativeState, PlayerId } from '../timer/types';
import { CircleGrid } from './CircleGrid';

interface CenterBandProps {
  operativeStates: Record<PlayerId, OperativeState[]>;
  initiativeHolder: PlayerId;
  turningPoint: number;
  activationPhase: ActivationPhase;
  onCycleOperative: (player: PlayerId, index: number) => void;
  onEndStrategyPhase: () => void;
}

export function CenterBand({
  operativeStates,
  initiativeHolder,
  turningPoint,
  activationPhase,
  onCycleOperative,
  onEndStrategyPhase,
}: CenterBandProps) {
  return (
    <div className="flex flex-col bg-neutral-950 m-3">
      <span className="text-sm uppercase tracking-wider text-neutral-600">Turning Point {turningPoint}</span>
      {activationPhase === 'initiative' ? (
        <div className="flex flex-col items-center gap-1 py-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-100">Roll for initiative</p>
          <p className="text-xs text-neutral-400">Tap the player who won</p>
        </div>
      ) : activationPhase === 'strategy' ? (
        <button
          type="button"
          onClick={onEndStrategyPhase}
          className="flex flex-col items-center gap-1 py-4 text-center"
        >
          <span className="text-sm font-semibold uppercase tracking-wide text-neutral-100">Strategy phase</span>
          <span className="text-xs text-neutral-400">Tap to end strategy phase</span>
        </button>
      ) : (
        <CircleGrid operativeStates={operativeStates} initiativeHolder={initiativeHolder} onCycle={onCycleOperative} />
      )}
    </div>
  );
}
