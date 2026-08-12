import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createInitialState,
  passTurn as enginePassTurn,
  remainingMs,
  resetToSetup as engineResetToSetup,
  setSharedDepletion as engineSetSharedDepletion,
  startGame as engineStartGame,
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

  const startGame = useCallback((budgets: Record<PlayerId, number>, startingPlayer: PlayerId = 'A') => {
    setState((s) => engineStartGame(s, budgets, Date.now(), startingPlayer));
  }, []);

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
  };
}
