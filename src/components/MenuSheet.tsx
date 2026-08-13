import type { PlayerId } from '../timer/types';

interface MenuSheetProps {
  isPaused: boolean;
  isShared: boolean;
  turningPoint: number;
  initiativeHolder: PlayerId;
  /** Which player long-pressed to open this menu — B's sheet opens at the top, upside down, to match B's own zone orientation. */
  origin: PlayerId;
  /**
   * One MenuSheet is mounted per player, permanently, sitting off-screen at
   * its own edge; the parent renders both simultaneously and only one is
   * ever `visible` at a time, so opening one implicitly dismisses the other.
   */
  visible: boolean;
  onTogglePause: () => void;
  onToggleShared: () => void;
  onReset: () => void;
  onAdvanceTurningPoint: () => void;
  onToggleInitiative: () => void;
  onClose: () => void;
}

export function MenuSheet({
  isPaused,
  isShared,
  turningPoint,
  initiativeHolder,
  origin,
  visible,
  onTogglePause,
  onToggleShared,
  onReset,
  onAdvanceTurningPoint,
  onToggleInitiative,
  onClose,
}: MenuSheetProps) {
  // Slides in from whichever edge the sheet is anchored to: up from below for
  // A's bottom sheet, down from above for B's top sheet.
  const positionClass = origin === 'B' ? 'top-0 rotate-180 border-b' : 'bottom-0 border-t';
  const offScreenClass = origin === 'B' ? '-translate-y-full' : 'translate-y-full';
  const translateClass = visible ? 'translate-y-0' : offScreenClass;

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 z-20 flex flex-col gap-3 border-neutral-700 bg-neutral-900 p-5 transition-transform duration-300 ease-out ${positionClass} ${translateClass} ${
        visible ? '' : 'pointer-events-none'
      }`}
    >
      <div>
        <p className="mb-2 text-sm uppercase tracking-wider text-neutral-500">Clock</p>
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onTogglePause}
            className="rounded-lg bg-neutral-800 p-3.5 text-left text-lg text-neutral-100"
          >
            {isPaused ? 'Resume game' : 'Pause game'}
          </button>
          <button
            type="button"
            onClick={onToggleShared}
            className="rounded-lg bg-neutral-800 p-3.5 text-left text-lg text-neutral-100"
          >
            Shared depletion {isShared && <span className="float-right opacity-70">✓ on</span>}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg bg-neutral-800 p-3.5 text-left text-lg text-neutral-100"
          >
            Reset (back to setup)
          </button>
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm uppercase tracking-wider text-neutral-500">Game state</p>
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onAdvanceTurningPoint}
            className="w-full rounded-lg bg-neutral-800 p-3.5 text-left text-lg text-neutral-100"
          >
            Next turning point <span className="float-right opacity-70">currently {turningPoint}</span>
          </button>
          <button
            type="button"
            onClick={onToggleInitiative}
            className="w-full rounded-lg bg-neutral-800 p-3.5 text-left text-lg text-neutral-100"
          >
            Toggle initiative <span className="float-right opacity-70">currently Player {initiativeHolder}</span>
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg bg-neutral-800 p-3.5 text-left text-lg text-neutral-100"
      >
        Close
      </button>
    </div>
  );
}
