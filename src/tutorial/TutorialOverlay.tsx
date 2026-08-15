import type { TutorialStep } from './steps';

const PHASES: Array<{ id: 'initiative' | 'strategy' | 'firefight'; label: string }> = [
  { id: 'initiative', label: 'Initiative' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'firefight', label: 'Firefight' },
];

function PhaseRail({ active }: { active: 'initiative' | 'strategy' | 'firefight' }) {
  return (
    <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide">
      {PHASES.map((p, i) => (
        <span key={p.id} className="flex items-center gap-1">
          {i > 0 && <span className="text-neutral-600">→</span>}
          <span className={`rounded px-2 py-0.5 ${p.id === active ? 'bg-amber-300 text-neutral-900' : 'bg-neutral-800 text-neutral-500'}`}>
            {p.label}
          </span>
        </span>
      ))}
    </div>
  );
}

interface TutorialOverlayProps {
  step: TutorialStep;
  index: number;
  total: number;
  done: boolean;
  onBack: () => void;
  onNext: () => void;
  onExit: () => void;
}

/** Caption card + navigation. `card` steps sit centred over a scrim; `board` steps hug an edge so the live board stays visible. */
export function TutorialOverlay({ step, index, total, done, onBack, onNext, onExit }: TutorialOverlayProps) {
  const isLast = index === total - 1;
  const nextLabel = isLast ? 'Finish' : step.kind === 'card' && index === 0 ? 'Start' : 'Next';
  const nextDisabled = Boolean(step.require) && !done;

  const card = (
    <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900/95 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          {step.phase && <PhaseRail active={step.phase} />}
          <h2 className="text-xl font-bold text-neutral-50">{step.title}</h2>
        </div>
        <button
          type="button"
          onClick={onExit}
          aria-label="Exit tutorial"
          className="shrink-0 rounded-lg bg-neutral-800 px-2 py-1 text-sm text-neutral-300"
        >
          Exit ✕
        </button>
      </div>

      <ul className="mt-2 space-y-1 text-[15px] leading-snug text-neutral-200">
        {step.lines.map((line) => (
          <li key={line} className="flex gap-2">
            <span className="text-amber-300">•</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      {step.why && <p className="mt-2 text-[13px] leading-snug text-neutral-400">{step.why}</p>}

      {step.require && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${done ? 'bg-emerald-900/60 text-emerald-200' : 'bg-amber-300/15 text-amber-200'}`}>
          {done ? `✓ ${step.doneHint ?? 'Done.'}` : `👆 ${step.prompt}`}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-amber-300' : 'bg-neutral-700'}`} />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            disabled={index === 0}
            className="rounded-lg bg-neutral-800 px-4 py-2 text-sm text-neutral-200 disabled:opacity-30"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="rounded-lg bg-amber-300 px-5 py-2 text-sm font-semibold text-neutral-900 disabled:opacity-30"
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );

  if (step.anchor === 'center') {
    return (
      <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">{card}</div>
    );
  }

  const edge = step.anchor === 'top' ? 'top-0 pt-3' : 'bottom-0 pb-3';
  return <div className={`pointer-events-none fixed inset-x-0 z-40 flex justify-center px-3 ${edge}`}>{card}</div>;
}
