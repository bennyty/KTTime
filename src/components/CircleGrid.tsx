import type { OperativeState, PlayerId } from '../timer/types';

const CIRCLE_UNITS = 2;

function stateClass(state: OperativeState) {
  switch (state) {
    case 'activated':
      return 'bg-emerald-950';
    case 'incapacitated':
      return 'bg-neutral-950 text-red-800';
    case 'ready':
      return 'bg-emerald-400';
    default:
      alert("Unknown Operative State")
      return 'bg-yellow-900'; // unknown state
  }
}

/**
 * Tap-target grid for the reserved center band: one circle per operative,
 * per player. Each circle cycles Ready (bright) → Activated (dark) →
 * Incapacitated (darker, skull glyph) on tap, and the row belonging to
 * whichever player lacks initiative is nudged right by half a circle
 * diameter (KTTime issue #6/#7).
 *
 * Sizing/offset is pure CSS flex-grow ratio, no measurement: each circle is
 * flex-grow 2, and a half-circle offset is a flex-grow 1 leading spacer.
 * Every row reserves the same total flex-grow budget — sized to the larger
 * of the two players' operative counts — regardless of whether it uses the
 * offset, so circle size stays constant either way (the row without a
 * leading spacer gets a correspondingly larger trailing spacer).
 */
function Row({
  player,
  states,
  onCycle,
  offset,
  rowUnits,
}: {
  player: PlayerId;
  states: OperativeState[];
  onCycle: (index: number) => void;
  offset: boolean;
  rowUnits: number;
}) {
  const leadingUnits = offset ? 1 : 0;
  const trailingUnits = rowUnits - leadingUnits - CIRCLE_UNITS * states.length;

  return (
    <div className="flex w-full gap-1">
      {leadingUnits > 0 && <div aria-hidden style={{ flexGrow: leadingUnits, flexBasis: 0 }} />}
      {states.map((state, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onCycle(i)}
          aria-label={`Player ${player} operative ${i + 1}: ${state}`}
          className={`flex aspect-square items-center justify-center rounded-full text-xs leading-none ${stateClass(state)}`}
          style={{ flexGrow: CIRCLE_UNITS, flexBasis: 0 }}
        >
          {state === 'incapacitated' ? '☠' : ''}
        </button>
      ))}
      {trailingUnits > 0 && <div aria-hidden style={{ flexGrow: trailingUnits, flexBasis: 0 }} />}
    </div>
  );
}

interface CircleGridProps {
  operativeStates: Record<PlayerId, OperativeState[]>;
  initiativeHolder: PlayerId;
  onCycle: (player: PlayerId, index: number) => void;
}

export function CircleGrid({ operativeStates, initiativeHolder, onCycle }: CircleGridProps) {
  const maxCount = Math.max(operativeStates.A.length, operativeStates.B.length);
  const rowUnits = CIRCLE_UNITS * maxCount + 1;

  return (
    <div className="relative flex w-full flex-col gap-1">
      <Row
        player="B"
        states={operativeStates.B}
        onCycle={(i) => onCycle('B', i)}
        offset={initiativeHolder !== 'B'}
        rowUnits={rowUnits}
      />
      <Row
        player="A"
        states={operativeStates.A}
        onCycle={(i) => onCycle('A', i)}
        offset={initiativeHolder !== 'A'}
        rowUnits={rowUnits}
      />
    </div>
  );
}
