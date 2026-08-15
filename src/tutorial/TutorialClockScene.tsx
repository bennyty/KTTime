import { useRef } from 'react';
import { CircleGrid } from '../components/CircleGrid';
import { MenuSheet } from '../components/MenuSheet';
import { PlayerZone } from '../components/PlayerZone';
import type { PlayerId } from '../timer/types';
import { CounteractAnnotations } from './CounteractAnnotations';
import type { Highlight } from './steps';
import type { TutorialClock } from './useTutorialClock';

/** Pulsing ring that marks the region a step is drawing attention to. */
function Ring({ on }: { on: boolean }) {
  if (!on) return null;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 animate-pulse rounded-2xl ring-4 ring-amber-300/90"
    />
  );
}

interface TutorialClockSceneProps {
  clock: TutorialClock;
  highlight: Highlight;
  annotate: boolean;
  allowCycle: boolean;
  menuOpen: PlayerId | null;
  onZoneTap: (player: PlayerId) => void;
  onBandTap: () => void;
  onCycle: (player: PlayerId, index: number) => void;
  onOpenMenu: (player: PlayerId) => void;
  onCloseMenu: () => void;
  onAdvanceTurn: () => void;
}

/**
 * Tutorial duplicate of `ClockScreen`. It composes the app's real leaf
 * components (PlayerZone, CircleGrid, MenuSheet) unmodified, wraps each region
 * for highlight rings, and routes every interaction through the parent so a
 * step can gate what counts. The centre band's presentational logic is
 * re-implemented here (rather than reusing CenterBand) so the counteract
 * annotations can be layered over the live grid.
 */
export function TutorialClockScene({
  clock,
  highlight,
  annotate,
  allowCycle,
  menuOpen,
  onZoneTap,
  onBandTap,
  onCycle,
  onOpenMenu,
  onCloseMenu,
  onAdvanceTurn,
}: TutorialClockSceneProps) {
  const { state, remaining } = clock;
  const { activationPhase, turningPoint, initiativeHolder, operativeStates } = state.activation;
  const isShared = state.activePlayers.length === 2;
  const gridRef = useRef<HTMLDivElement>(null);

  const menuDisplay = { isPaused: state.activePlayers.length === 0, isShared, turningPoint, initiativeHolder };
  const menuActions = {
    onTogglePause: () => {
      clock.togglePause();
    },
    onToggleShared: () => {
      clock.setSharedDepletion(!isShared);
    },
    // The turning-point lesson wires this one up; the parent decides whether to
    // actually advance (only on that step) or just dismiss the menu.
    onAdvanceTurningPoint: onAdvanceTurn,
    // Read-only in the tutorial: these just dismiss the menu rather than
    // altering the scripted lesson.
    onReset: onCloseMenu,
    onToggleInitiative: onCloseMenu,
    onClose: onCloseMenu,
  };

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex flex-1">
        <PlayerZone
          player="B"
          remainingMs={remaining('B')}
          isActive={state.activePlayers.includes('B')}
          isShared={isShared}
          flipped
          onTap={() => onZoneTap('B')}
          onLongPress={() => onOpenMenu('B')}
        />
        <Ring on={highlight === 'zoneB' || highlight === 'both'} />
      </div>

      <div className="relative">
        <div className="flex flex-col bg-neutral-950 m-3">
          <span className="text-base uppercase tracking-wider text-neutral-600">Turning Point {turningPoint}</span>
          {activationPhase === 'initiative' ? (
            <div className="flex flex-col items-center gap-1 pb-4 text-center">
              <p className="text-lg font-semibold uppercase tracking-wide text-neutral-100">Roll for initiative</p>
              <p className="text-base text-neutral-400">Tap the player who won</p>
            </div>
          ) : activationPhase === 'strategy' ? (
            <button type="button" onClick={onBandTap} className="flex flex-col items-center gap-1 pb-4 text-center">
              <span className="text-lg font-semibold uppercase tracking-wide text-neutral-100">Strategy phase</span>
              <span className="text-base text-neutral-400">Tap here to end strategy phase</span>
            </button>
          ) : (
            <div ref={gridRef} className="relative">
              <CircleGrid
                operativeStates={operativeStates}
                initiativeHolder={initiativeHolder}
                onCycle={allowCycle ? onCycle : () => {}}
              />
              {annotate && (
                <CounteractAnnotations
                  containerRef={gridRef}
                  operativeStates={operativeStates}
                  initiativeHolder={initiativeHolder}
                  viewer="A"
                  signature={`${initiativeHolder}|${operativeStates.A.join('')}|${operativeStates.B.join('')}`}
                />
              )}
            </div>
          )}
        </div>
        <Ring on={highlight === 'band'} />
      </div>

      <div className="relative flex flex-1">
        <PlayerZone
          player="A"
          remainingMs={remaining('A')}
          isActive={state.activePlayers.includes('A')}
          isShared={isShared}
          flipped={false}
          onTap={() => onZoneTap('A')}
          onLongPress={() => onOpenMenu('A')}
        />
        <Ring on={highlight === 'zoneA' || highlight === 'both'} />
      </div>

      {menuOpen !== null && (
        <div aria-hidden="true" className="fixed inset-0 z-10 mx-auto max-w-4xl" onClick={onCloseMenu} />
      )}
      <MenuSheet origin="B" visible={menuOpen === 'B'} {...menuDisplay} {...menuActions} />
      <MenuSheet origin="A" visible={menuOpen === 'A'} {...menuDisplay} {...menuActions} />
    </div>
  );
}
