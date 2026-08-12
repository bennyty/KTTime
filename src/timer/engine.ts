import type { ActivationState, OperativeState, PersistedGameState, PlayerId, PlayerState } from './types';

const OTHER_PLAYER: Record<PlayerId, PlayerId> = { A: 'B', B: 'A' };
const DEFAULT_OPERATIVE_COUNT = 14;
const DEFAULT_OPERATIVE_COUNTS: Record<PlayerId, number> = { A: DEFAULT_OPERATIVE_COUNT, B: DEFAULT_OPERATIVE_COUNT };

const NEXT_OPERATIVE_STATE: Record<OperativeState, OperativeState> = {
  ready: 'activated',
  activated: 'incapacitated',
  incapacitated: 'ready',
};

function freshActivation(operativeCounts: Record<PlayerId, number>, autoActivateOnPass: boolean): ActivationState {
  return {
    operativeCounts,
    operativeStates: {
      A: Array(operativeCounts.A).fill('ready'),
      B: Array(operativeCounts.B).fill('ready'),
    },
    initiativeHolder: 'B',
    turningPoint: 1,
    awaitingInitiative: false,
    autoActivateOnPass,
  };
}

export function createInitialState(): PersistedGameState {
  const zero: PlayerState = { totalBudgetMs: 0, accumulatedElapsedMs: 0 };
  return {
    schemaVersion: 4,
    phase: 'setup',
    players: { A: { ...zero }, B: { ...zero } },
    activePlayers: [],
    turnStartTimestamp: null,
    pausedActivePlayers: null,
    preSharedActivePlayer: null,
    activation: freshActivation(DEFAULT_OPERATIVE_COUNTS, true),
  };
}

/**
 * Starts the game the same way a turning point advances: both players enter
 * shared depletion and `awaitingInitiative` is set, so the very first thing
 * that happens is rolling for initiative rather than assuming Player A goes
 * first. `resolveInitiative` (tapping the winner) hands the clock to them.
 */
export function startGame(
  _state: PersistedGameState,
  budgets: Record<PlayerId, number>,
  now: number,
  operativeCounts: Record<PlayerId, number> = DEFAULT_OPERATIVE_COUNTS,
  autoActivateOnPass = true,
): PersistedGameState {
  return {
    schemaVersion: 4,
    phase: 'active',
    players: {
      A: { totalBudgetMs: budgets.A, accumulatedElapsedMs: 0 },
      B: { totalBudgetMs: budgets.B, accumulatedElapsedMs: 0 },
    },
    activePlayers: ['A', 'B'],
    turnStartTimestamp: now,
    pausedActivePlayers: null,
    preSharedActivePlayer: null,
    activation: { ...freshActivation(operativeCounts, autoActivateOnPass), awaitingInitiative: true },
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

/**
 * Forgiveness feature (setup-time setting, default on): if *any* operative,
 * on either side, is already Activated this turning point (i.e. activation
 * tracking is "in use" this turning point), passing the turn auto-marks the
 * passing player's left-most Ready operative Activated too, in case they
 * forgot to tap it before passing. Does nothing before anyone has manually
 * activated an operative this turning point, nor once the passing player has
 * no Ready operatives left.
 */
function autoActivateOnPass(state: PersistedGameState, passingPlayer: PlayerId): PersistedGameState {
  if (!state.activation.autoActivateOnPass) return state;
  const anyActivated =
    state.activation.operativeStates.A.some((s) => s === 'activated') ||
    state.activation.operativeStates.B.some((s) => s === 'activated');
  if (!anyActivated) return state;
  const row = state.activation.operativeStates[passingPlayer];
  const readyIndex = row.findIndex((s) => s === 'ready');
  if (readyIndex === -1) return state;
  const newRow = [...row];
  newRow[readyIndex] = 'activated';
  return {
    ...state,
    activation: {
      ...state.activation,
      operativeStates: { ...state.activation.operativeStates, [passingPlayer]: newRow },
    },
  };
}

export function passTurn(state: PersistedGameState, now: number): PersistedGameState {
  if (state.activePlayers.length !== 1) return state;
  const passingPlayer = state.activePlayers[0];
  const other = OTHER_PLAYER[passingPlayer];
  return setActive(autoActivateOnPass(state, passingPlayer), [other], now);
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

export function cycleOperative(state: PersistedGameState, player: PlayerId, index: number): PersistedGameState {
  const row = [...state.activation.operativeStates[player]];
  row[index] = NEXT_OPERATIVE_STATE[row[index]];
  return {
    ...state,
    activation: {
      ...state.activation,
      operativeStates: { ...state.activation.operativeStates, [player]: row },
    },
  };
}

export function toggleInitiative(state: PersistedGameState): PersistedGameState {
  return {
    ...state,
    activation: { ...state.activation, initiativeHolder: OTHER_PLAYER[state.activation.initiativeHolder] },
  };
}

/**
 * Advancing a turning point also puts both players into shared depletion
 * (the clock keeps running fairly for both while they sort out who won
 * initiative) and flags `awaitingInitiative`, which the UI uses to cover the
 * activation grid with a "tap the winner" prompt. `resolveInitiative` clears
 * that flag once a player is tapped.
 */
export function advanceTurningPoint(state: PersistedGameState, now: number): PersistedGameState {
  const readyUpActivated = (row: OperativeState[]) => row.map((s) => (s === 'activated' ? 'ready' : s));
  const activated = setActive(state, ['A', 'B'], now);
  return {
    ...activated,
    activation: {
      ...state.activation,
      turningPoint: state.activation.turningPoint + 1,
      awaitingInitiative: true,
      operativeStates: {
        A: readyUpActivated(state.activation.operativeStates.A),
        B: readyUpActivated(state.activation.operativeStates.B),
      },
    },
  };
}

export function resolveInitiative(state: PersistedGameState, winner: PlayerId, now: number): PersistedGameState {
  if (!state.activation.awaitingInitiative) return state;
  const activated = setActive(state, [winner], now);
  return {
    ...activated,
    preSharedActivePlayer: null,
    activation: { ...state.activation, initiativeHolder: winner, awaitingInitiative: false },
  };
}
