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
      className={`fixed inset-x-0 z-20 mx-auto flex max-w-4xl flex-col gap-3 border-neutral-700 bg-neutral-900 p-5 transition-transform duration-300 ease-out ${positionClass} ${translateClass} ${
        visible ? '' : 'pointer-events-none'
      }`}
    >
      <div>
        <p className="mb-2 text-sm uppercase tracking-wider text-neutral-500">Clock</p>
        <div className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={onTogglePause}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg bg-neutral-800 p-2 text-neutral-100"
          >
            <PauseIcon />
            <span className="text-sm">{isPaused ? 'Resume' : 'Pause'}</span>
          </button>
          <button
            type="button"
            onClick={onToggleShared}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg bg-neutral-800 p-2 text-neutral-100"
          >
            <ChainIcon />
            <span className="text-sm">Shared Time{isShared && <span className="ml-1 opacity-70">✓</span>}</span>
          </button>
          <button
            type="button"
            onClick={onReset}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg bg-neutral-800 p-2 text-neutral-100"
          >
            <ResetIcon />
            <span className="text-sm">Reset</span>
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

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
      <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ChainIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-6 w-6">
      <path d="M9 15 15 9" />
      <path d="M10.5 6.5 12 5a3.54 3.54 0 0 1 5 5l-1.5 1.5" />
      <path d="M13.5 17.5 12 19a3.54 3.54 0 0 1-5-5l1.5-1.5" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}
