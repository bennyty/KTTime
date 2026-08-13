import { useCallback, useEffect, useRef, useState } from 'react';
import {
  advanceTurningPoint as engineAdvanceTurningPoint,
  createInitialState,
  cycleOperative as engineCycleOperative,
  endStrategyPhase as engineEndStrategyPhase,
  passTurn as enginePassTurn,
  remainingMs,
  resetToSetup as engineResetToSetup,
  resolveInitiative as engineResolveInitiative,
  setSharedDepletion as engineSetSharedDepletion,
  startGame as engineStartGame,
  toggleInitiative as engineToggleInitiative,
  togglePause as engineTogglePause,
} from '../timer/engine';
import { registerLifecyclePersistence } from '../timer/lifecycle';
import { clearState, loadState, saveState } from '../timer/persistence';
import type { PersistedGameState, PlayerId } from '../timer/types';

const TICK_INTERVAL_MS = 250;

export function useGameClock() {
  const [state, setState] = useState<PersistedGameState>(() => loadState() ?? createInitialState());
  const [, forceTick] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Persist on every state change — the transition functions themselves are
  // the primary write trigger; lifecycle events below are a checkpoint on top.
  useEffect(() => {
    if (state.phase === 'active') {
      saveState(state);
    } else {
      clearState();
    }
  }, [state]);

  // Re-render on an interval while a clock is actually running, so the
  // displayed time keeps moving. Reconciliation always reads Date.now()
  // fresh, so this interval is purely cosmetic, never load-bearing for
  // correctness.
  useEffect(() => {
    if (state.activePlayers.length === 0) return;
    const id = setInterval(() => forceTick((n) => n + 1), TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [state.activePlayers]);

  useEffect(
    () =>
      registerLifecyclePersistence(
        () => stateRef.current,
        () => setState(loadState() ?? createInitialState()),
      ),
    [],
  );

  const startGame = useCallback(
    (budgets: Record<PlayerId, number>, operativeCounts?: Record<PlayerId, number>, autoActivateOnPass?: boolean) => {
      setState((s) => engineStartGame(s, budgets, Date.now(), operativeCounts, autoActivateOnPass));
    },
    [],
  );

  const passTurn = useCallback(() => {
    setState((s) => enginePassTurn(s, Date.now()));
  }, []);

  const setSharedDepletion = useCallback((on: boolean) => {
    setState((s) => engineSetSharedDepletion(s, on, Date.now()));
  }, []);

  const togglePause = useCallback(() => {
    setState((s) => engineTogglePause(s, Date.now()));
  }, []);

  const reset = useCallback(() => {
    setState((s) => engineResetToSetup(s));
  }, []);

  const cycleOperative = useCallback((player: PlayerId, index: number) => {
    setState((s) => engineCycleOperative(s, player, index));
  }, []);

  const toggleInitiative = useCallback(() => {
    setState((s) => engineToggleInitiative(s));
  }, []);

  const advanceTurningPoint = useCallback(() => {
    setState((s) => engineAdvanceTurningPoint(s, Date.now()));
  }, []);

  const resolveInitiative = useCallback((winner: PlayerId) => {
    setState((s) => engineResolveInitiative(s, winner, Date.now()));
  }, []);

  const endStrategyPhase = useCallback(() => {
    setState((s) => engineEndStrategyPhase(s));
  }, []);

  const now = Date.now();

  return {
    state,
    now,
    remaining: (player: PlayerId) => remainingMs(state, player, now),
    startGame,
    passTurn,
    setSharedDepletion,
    togglePause,
    reset,
    cycleOperative,
    toggleInitiative,
    advanceTurningPoint,
    resolveInitiative,
    endStrategyPhase,
  };
}
