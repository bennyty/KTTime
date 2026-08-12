interface MenuSheetProps {
  isPaused: boolean;
  isShared: boolean;
  onTogglePause: () => void;
  onToggleShared: () => void;
  onReset: () => void;
  onClose: () => void;
}

export function MenuSheet({ isPaused, isShared, onTogglePause, onToggleShared, onReset, onClose }: MenuSheetProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 flex flex-col gap-2.5 border-t border-neutral-700 bg-neutral-900 p-5">
      <button
        type="button"
        onClick={onTogglePause}
        className="rounded-lg bg-neutral-800 p-3.5 text-left text-base text-neutral-100"
      >
        {isPaused ? 'Resume game' : 'Pause game'}
      </button>
      <button
        type="button"
        onClick={onToggleShared}
        className="rounded-lg bg-neutral-800 p-3.5 text-left text-base text-neutral-100"
      >
        Shared depletion {isShared && <span className="float-right opacity-70">✓ on</span>}
      </button>
      <button
        type="button"
        onClick={onReset}
        className="rounded-lg bg-neutral-800 p-3.5 text-left text-base text-neutral-100"
      >
        Reset (back to setup)
      </button>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg bg-neutral-800 p-3.5 text-left text-base text-neutral-100"
      >
        Close
      </button>
    </div>
  );
}
