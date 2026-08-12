import type { PersistedGameState, PlayerId, PlayerState } from './types';

const OTHER_PLAYER: Record<PlayerId, PlayerId> = { A: 'B', B: 'A' };

export function createInitialState(): PersistedGameState {
  const zero: PlayerState = { totalBudgetMs: 0, accumulatedElapsedMs: 0 };
  return {
    schemaVersion: 1,
    phase: 'setup',
    players: { A: { ...zero }, B: { ...zero } },
    activePlayers: [],
    turnStartTimestamp: null,
    pausedActivePlayers: null,
    preSharedActivePlayer: null,
  };
}

export function startGame(
  _state: PersistedGameState,
  budgets: Record<PlayerId, number>,
  now: number,
  startingPlayer: PlayerId = 'A',
): PersistedGameState {
  return {
    schemaVersion: 1,
    phase: 'active',
    players: {
      A: { totalBudgetMs: budgets.A, accumulatedElapsedMs: 0 },
      B: { totalBudgetMs: budgets.B, accumulatedElapsedMs: 0 },
    },
    activePlayers: [startingPlayer],
    turnStartTimestamp: now,
    pausedActivePlayers: null,
    preSharedActivePlayer: null,
  };
}

/**
 * Folds live elapsed time into `accumulatedElapsedMs` for every currently
 * active player, at a rate of 1 / activePlayers.length each — so a normal
 * single-player turn accrues at full rate, and shared-depletion mode (both
 * players active) accrues at half rate each, keeping the combined clock's
 * drain rate at 1 real second per real second. See KTTime issue #3 and its
 * shared-depletion amendment.
 */
function commitActive(state: PersistedGameState, now: number): PersistedGameState {
  if (state.activePlayers.length === 0 || state.turnStartTimestamp === null) {
    return state;
  }
  const rate = 1 / state.activePlayers.length;
  const liveElapsedMs = (now - state.turnStartTimestamp) * rate;
  const players = { ...state.players };
  for (const player of state.activePlayers) {
    players[player] = {
      ...players[player],
      accumulatedElapsedMs: players[player].accumulatedElapsedMs + liveElapsedMs,
    };
  }
  return { ...state, players };
}

function setActive(state: PersistedGameState, activePlayers: PlayerId[], now: number): PersistedGameState {
  const committed = commitActive(state, now);
  return {
    ...committed,
    activePlayers,
    turnStartTimestamp: activePlayers.length > 0 ? now : null,
  };
}

export function passTurn(state: PersistedGameState, now: number): PersistedGameState {
  if (state.activePlayers.length !== 1) return state;
  const other = OTHER_PLAYER[state.activePlayers[0]];
  return setActive(state, [other], now);
}

export function setSharedDepletion(state: PersistedGameState, on: boolean, now: number): PersistedGameState {
  if (on) {
    if (state.activePlayers.length !== 1) return state;
    const previous = state.activePlayers[0];
    return { ...setActive(state, ['A', 'B'], now), preSharedActivePlayer: previous };
  }
  if (state.activePlayers.length !== 2) return state;
  const restore = state.preSharedActivePlayer ?? 'A';
  return { ...setActive(state, [restore], now), preSharedActivePlayer: null };
}

export function togglePause(state: PersistedGameState, now: number): PersistedGameState {
  if (state.activePlayers.length === 0) {
    const restore = state.pausedActivePlayers ?? ['A'];
    return { ...setActive(state, restore, now), pausedActivePlayers: null };
  }
  const current = state.activePlayers;
  return { ...setActive(state, [], now), pausedActivePlayers: current };
}

export function resetToSetup(_state: PersistedGameState): PersistedGameState {
  return createInitialState();
}

export function remainingMs(state: PersistedGameState, player: PlayerId, now: number): number {
  const isActive = state.activePlayers.includes(player);
  const rate = isActive ? 1 / state.activePlayers.length : 0;
  const liveElapsedMs = isActive && state.turnStartTimestamp !== null ? rate * (now - state.turnStartTimestamp) : 0;
  const { totalBudgetMs, accumulatedElapsedMs } = state.players[player];
  return totalBudgetMs - (accumulatedElapsedMs + liveElapsedMs);
}
