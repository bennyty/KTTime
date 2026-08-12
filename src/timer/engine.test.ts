import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  passTurn,
  remainingMs,
  resetToSetup,
  setSharedDepletion,
  startGame,
  togglePause,
} from './engine';

const HOUR = 60 * 60 * 1000;
const T0 = 1_700_000_000_000; // arbitrary fixed epoch for deterministic tests

describe('createInitialState', () => {
  it('starts in setup phase with no active players', () => {
    const state = createInitialState();
    expect(state.phase).toBe('setup');
    expect(state.activePlayers).toEqual([]);
    expect(state.turnStartTimestamp).toBeNull();
  });
});

describe('startGame', () => {
  it('initializes budgets and activates the starting player', () => {
    const state = startGame(createInitialState(), { A: HOUR, B: HOUR }, T0);
    expect(state.phase).toBe('active');
    expect(state.players.A).toEqual({ totalBudgetMs: HOUR, accumulatedElapsedMs: 0 });
    expect(state.players.B).toEqual({ totalBudgetMs: HOUR, accumulatedElapsedMs: 0 });
    expect(state.activePlayers).toEqual(['A']);
    expect(state.turnStartTimestamp).toBe(T0);
  });

  it('supports asymmetric budgets and a different starting player', () => {
    const state = startGame(createInitialState(), { A: 90 * 60_000, B: 30 * 60_000 }, T0, 'B');
    expect(state.players.A.totalBudgetMs).toBe(90 * 60_000);
    expect(state.players.B.totalBudgetMs).toBe(30 * 60_000);
    expect(state.activePlayers).toEqual(['B']);
  });
});

describe('remainingMs', () => {
  it('subtracts live elapsed time for the active player only', () => {
    const state = startGame(createInitialState(), { A: HOUR, B: HOUR }, T0);
    const now = T0 + 10_000;
    expect(remainingMs(state, 'A', now)).toBe(HOUR - 10_000);
    expect(remainingMs(state, 'B', now)).toBe(HOUR);
  });

  it('goes negative once the budget is exceeded (tracked overtime, no floor)', () => {
    const state = startGame(createInitialState(), { A: 5_000, B: HOUR }, T0);
    const now = T0 + 12_000;
    expect(remainingMs(state, 'A', now)).toBe(-7_000);
  });
});

describe('passTurn', () => {
  it('commits the outgoing player\'s elapsed time and activates the other player', () => {
    let state = startGame(createInitialState(), { A: HOUR, B: HOUR }, T0);
    state = passTurn(state, T0 + 10_000);

    expect(state.activePlayers).toEqual(['B']);
    expect(state.turnStartTimestamp).toBe(T0 + 10_000);
    expect(state.players.A.accumulatedElapsedMs).toBe(10_000);
    expect(state.players.B.accumulatedElapsedMs).toBe(0);
    expect(remainingMs(state, 'A', T0 + 10_000)).toBe(HOUR - 10_000);
  });

  it('alternates correctly across multiple passes', () => {
    let state = startGame(createInitialState(), { A: HOUR, B: HOUR }, T0);
    state = passTurn(state, T0 + 10_000); // A -> B, A spent 10s
    state = passTurn(state, T0 + 25_000); // B -> A, B spent 15s
    expect(state.activePlayers).toEqual(['A']);
    expect(state.players.A.accumulatedElapsedMs).toBe(10_000);
    expect(state.players.B.accumulatedElapsedMs).toBe(15_000);
  });
});

describe('setSharedDepletion', () => {
  it('activates both players at half-rate each, so the combined clock drains 1:1 with real time', () => {
    let state = startGame(createInitialState(), { A: HOUR, B: HOUR }, T0);
    state = setSharedDepletion(state, true, T0 + 5_000); // A had the turn for 5s, then shared kicks in
    expect(state.activePlayers).toEqual(['A', 'B']);
    expect(state.players.A.accumulatedElapsedMs).toBe(5_000);

    const now = T0 + 5_000 + 20_000; // 20s of shared depletion
    // each player only loses half of the 20s = 10s
    expect(remainingMs(state, 'A', now)).toBe(HOUR - 5_000 - 10_000);
    expect(remainingMs(state, 'B', now)).toBe(HOUR - 10_000);
  });

  it('restores the previously active single player when turned off', () => {
    let state = startGame(createInitialState(), { A: HOUR, B: HOUR }, T0);
    state = passTurn(state, T0 + 1_000); // A spent 1s, now B's turn
    state = setSharedDepletion(state, true, T0 + 2_000); // B spent 1s solo before shared kicked in
    state = setSharedDepletion(state, false, T0 + 12_000);
    expect(state.activePlayers).toEqual(['B']);
    // both start shared mode with 1s already accumulated, then 10s of shared
    // depletion at half rate adds 5s to each
    expect(state.players.A.accumulatedElapsedMs).toBe(1_000 + 5_000);
    expect(state.players.B.accumulatedElapsedMs).toBe(1_000 + 5_000);
  });

  it('is a no-op if already in the requested state', () => {
    let state = startGame(createInitialState(), { A: HOUR, B: HOUR }, T0);
    const beforeOff = passTurn(state, T0); // still just one active player
    const afterOffNoop = setSharedDepletion(beforeOff, false, T0 + 999);
    expect(afterOffNoop).toEqual(beforeOff);
  });
});

describe('togglePause', () => {
  it('freezes accumulation and resumes with the same active player(s)', () => {
    let state = startGame(createInitialState(), { A: HOUR, B: HOUR }, T0);
    state = togglePause(state, T0 + 8_000); // pause after 8s of A's turn
    expect(state.activePlayers).toEqual([]);
    expect(state.turnStartTimestamp).toBeNull();
    expect(state.players.A.accumulatedElapsedMs).toBe(8_000);

    // time passes while paused — must not accrue
    const stillPaused = remainingMs(state, 'A', T0 + 999_000);
    expect(stillPaused).toBe(HOUR - 8_000);

    state = togglePause(state, T0 + 999_000); // resume
    expect(state.activePlayers).toEqual(['A']);
    expect(state.turnStartTimestamp).toBe(T0 + 999_000);
    expect(remainingMs(state, 'A', T0 + 999_000 + 2_000)).toBe(HOUR - 8_000 - 2_000);
  });

  it('pausing during shared depletion resumes both players', () => {
    let state = startGame(createInitialState(), { A: HOUR, B: HOUR }, T0);
    state = setSharedDepletion(state, true, T0);
    state = togglePause(state, T0 + 10_000);
    expect(state.activePlayers).toEqual([]);
    state = togglePause(state, T0 + 20_000);
    expect(state.activePlayers).toEqual(['A', 'B']);
  });
});

describe('resetToSetup', () => {
  it('returns a fresh setup-phase state regardless of prior progress', () => {
    let state = startGame(createInitialState(), { A: HOUR, B: HOUR }, T0);
    state = passTurn(state, T0 + 50_000);
    state = resetToSetup(state);
    expect(state).toEqual(createInitialState());
  });
});
