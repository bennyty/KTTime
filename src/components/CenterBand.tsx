import { CircleGrid } from './CircleGrid';

interface CenterBandProps {
  onOpenMenu: () => void;
}

export function CenterBand({ onOpenMenu }: CenterBandProps) {
  return (
    <div className="relative flex flex-none flex-col items-center justify-center gap-1.5 bg-neutral-950 py-3">
      <CircleGrid />
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Menu"
        className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-800 text-lg text-neutral-400"
      >
        ⋮
      </button>
    </div>
  );
}
