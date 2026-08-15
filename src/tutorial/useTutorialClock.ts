import { useCallback, useEffect, useState } from 'react';
import {
  advanceTurningPoint as engineAdvanceTurningPoint,
  cycleOperative as engineCycleOperative,
  endStrategyPhase as engineEndStrategyPhase,
  passTurn as enginePassTurn,
  remainingMs,
  resolveInitiative as engineResolveInitiative,
  setSharedDepletion as engineSetSharedDepletion,
  togglePause as engineTogglePause,
} from '../timer/engine';
import type { PersistedGameState, PlayerId } from '../timer/types';

const TICK_INTERVAL_MS = 250;

/**
 * A clock for the tutorial only. It reuses the real, pure `engine` transition
 * functions so behaviour matches the live app exactly, but deliberately omits
 * all persistence and lifecycle wiring: nothing here reads or writes
 * localStorage, so opening the tutorial can never clobber a real in-progress
 * game. `loadScenario` lets a tutorial step jump the clock to a scripted state.
 */
export function useTutorialClock(initial: PersistedGameState) {
  const [state, setState] = useState<PersistedGameState>(initial);
  const [, forceTick] = useState(0);

  // Purely cosmetic re-render so the displayed time keeps moving; correctness
  // always reads Date.now() fresh in remainingMs.
  useEffect(() => {
    if (state.activePlayers.length === 0) return;
    const id = setInterval(() => forceTick((n) => n + 1), TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [state.activePlayers]);

  const loadScenario = useCallback((next: PersistedGameState) => setState(next), []);
  const passTurn = useCallback(() => setState((s) => enginePassTurn(s, Date.now())), []);
  const togglePause = useCallback(() => setState((s) => engineTogglePause(s, Date.now())), []);
  const setSharedDepletion = useCallback(
    (on: boolean) => setState((s) => engineSetSharedDepletion(s, on, Date.now())),
    [],
  );
  const cycleOperative = useCallback(
    (player: PlayerId, index: number) => setState((s) => engineCycleOperative(s, player, index)),
    [],
  );
  const resolveInitiative = useCallback(
    (winner: PlayerId) => setState((s) => engineResolveInitiative(s, winner, Date.now())),
    [],
  );
  const endStrategyPhase = useCallback(() => setState((s) => engineEndStrategyPhase(s)), []);
  const advanceTurningPoint = useCallback(() => setState((s) => engineAdvanceTurningPoint(s, Date.now())), []);

  const now = Date.now();

  return {
    state,
    remaining: (player: PlayerId) => remainingMs(state, player, now),
    loadScenario,
    passTurn,
    togglePause,
    setSharedDepletion,
    cycleOperative,
    resolveInitiative,
    endStrategyPhase,
    advanceTurningPoint,
  };
}

export type TutorialClock = ReturnType<typeof useTutorialClock>;
