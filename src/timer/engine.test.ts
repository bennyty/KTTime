import { describe, expect, it } from 'vitest';
import {
  advanceTurningPoint,
  createInitialState,
  cycleOperative,
  passTurn,
  remainingMs,
  resetToSetup,
  resolveInitiative,
  setSharedDepletion,
  startGame,
  toggleInitiative,
  togglePause,
} from './engine';
import type { PersistedGameState, PlayerId } from './types';

const HOUR = 60 * 60 * 1000;
const T0 = 1_700_000_000_000; // arbitrary fixed epoch for deterministic tests

/**
 * `startGame` now always begins in shared depletion, awaiting initiative
 * (same as advancing a turning point) — most of the tests below are about
 * other mechanics, so this fast-forwards through that opening step exactly
 * as the app would (tap a winner) to reach a normal single-active-player
 * state, defaulting to A winning at T0 so downstream `now` math lines up
 * with the old fixture shape.
 */
function startAndResolveInitiative(
  budgets: Record<PlayerId, number>,
  operativeCounts?: Record<PlayerId, number>,
  autoActivateOnPass?: boolean,
  winner: PlayerId = 'A',
): PersistedGameState {
  return resolveInitiative(startGame(createInitialState(), budgets, T0, operativeCounts, autoActivateOnPass), winner, T0);
}

describe('createInitialState', () => {
  it('starts in setup phase with no active players', () => {
    const state = createInitialState();
    expect(state.phase).toBe('setup');
    expect(state.activePlayers).toEqual([]);
    expect(state.turnStartTimestamp).toBeNull();
  });
});

describe('startGame', () => {
  it('initializes budgets and begins in shared depletion, awaiting initiative', () => {
    const state = startGame(createInitialState(), { A: HOUR, B: HOUR }, T0);
    expect(state.phase).toBe('active');
    expect(state.players.A).toEqual({ totalBudgetMs: HOUR, accumulatedElapsedMs: 0 });
    expect(state.players.B).toEqual({ totalBudgetMs: HOUR, accumulatedElapsedMs: 0 });
    expect(state.activePlayers).toEqual(['A', 'B']);
    expect(state.turnStartTimestamp).toBe(T0);
    expect(state.activation.awaitingInitiative).toBe(true);
  });

  it('supports asymmetric budgets', () => {
    const state = startGame(createInitialState(), { A: 90 * 60_000, B: 30 * 60_000 }, T0);
    expect(state.players.A.totalBudgetMs).toBe(90 * 60_000);
    expect(state.players.B.totalBudgetMs).toBe(30 * 60_000);
  });

  it('hands the clock to whoever wins the opening initiative roll', () => {
    const state = resolveInitiative(startGame(createInitialState(), { A: HOUR, B: HOUR }, T0), 'B', T0 + 3_000);
    expect(state.activePlayers).toEqual(['B']);
    expect(state.activation.initiativeHolder).toBe('B');
    expect(state.activation.awaitingInitiative).toBe(false);
  });

  it('defaults activation state to 14 ready operatives each, turning point 1', () => {
    const state = startGame(createInitialState(), { A: HOUR, B: HOUR }, T0);
    expect(state.activation.operativeCounts).toEqual({ A: 14, B: 14 });
    expect(state.activation.operativeStates.A).toEqual(Array(14).fill('ready'));
    expect(state.activation.operativeStates.B).toEqual(Array(14).fill('ready'));
    expect(state.activation.turningPoint).toBe(1);
  });

  it('sizes operative rows from the given per-player operative counts', () => {
    const state = startGame(createInitialState(), { A: HOUR, B: HOUR }, T0, { A: 6, B: 9 });
    expect(state.activation.operativeCounts).toEqual({ A: 6, B: 9 });
    expect(state.activation.operativeStates.A).toHaveLength(6);
    expect(state.activation.operativeStates.B).toHaveLength(9);
  });
});

describe('remainingMs', () => {
  it('subtracts live elapsed time for the active player only', () => {
    const state = startAndResolveInitiative({ A: HOUR, B: HOUR });
    const now = T0 + 10_000;
    expect(remainingMs(state, 'A', now)).toBe(HOUR - 10_000);
    expect(remainingMs(state, 'B', now)).toBe(HOUR);
  });

  it('goes negative once the budget is exceeded (tracked overtime, no floor)', () => {
    const state = startAndResolveInitiative({ A: 5_000, B: HOUR });
    const now = T0 + 12_000;
    expect(remainingMs(state, 'A', now)).toBe(-7_000);
  });
});

describe('passTurn', () => {
  it('commits the outgoing player\'s elapsed time and activates the other player', () => {
    let state = startAndResolveInitiative({ A: HOUR, B: HOUR });
    state = passTurn(state, T0 + 10_000);

    expect(state.activePlayers).toEqual(['B']);
    expect(state.turnStartTimestamp).toBe(T0 + 10_000);
    expect(state.players.A.accumulatedElapsedMs).toBe(10_000);
    expect(state.players.B.accumulatedElapsedMs).toBe(0);
    expect(remainingMs(state, 'A', T0 + 10_000)).toBe(HOUR - 10_000);
  });

  it('alternates correctly across multiple passes', () => {
    let state = startAndResolveInitiative({ A: HOUR, B: HOUR });
    state = passTurn(state, T0 + 10_000); // A -> B, A spent 10s
    state = passTurn(state, T0 + 25_000); // B -> A, B spent 15s
    expect(state.activePlayers).toEqual(['A']);
    expect(state.players.A.accumulatedElapsedMs).toBe(10_000);
    expect(state.players.B.accumulatedElapsedMs).toBe(15_000);
  });

  describe('auto-activate on pass (default on)', () => {
    it('does nothing before anyone has manually activated an operative this turning point', () => {
      let state = startAndResolveInitiative({ A: HOUR, B: HOUR });
      state = passTurn(state, T0 + 1_000);
      expect(state.activation.operativeStates.A).toEqual(Array(14).fill('ready'));
    });

    it('auto-marks the left-most Ready operative once the passing player has at least one Activated', () => {
      let state = startAndResolveInitiative({ A: HOUR, B: HOUR });
      state = cycleOperative(state, 'A', 3); // ready -> activated
      state = passTurn(state, T0 + 1_000);
      expect(state.activation.operativeStates.A[0]).toBe('activated'); // left-most Ready, auto-marked
      expect(state.activation.operativeStates.A[3]).toBe('activated'); // untouched
    });

    it("is a global check: the OTHER player having an Activated operative is enough to trigger it", () => {
      let state = startAndResolveInitiative({ A: HOUR, B: HOUR });
      state = cycleOperative(state, 'B', 5); // B has activated one; A has activated none
      state = passTurn(state, T0 + 1_000); // A passes
      expect(state.activation.operativeStates.A[0]).toBe('activated'); // still auto-marked for A
    });

    it("only writes to the passing player's own row", () => {
      let state = startAndResolveInitiative({ A: HOUR, B: HOUR });
      state = cycleOperative(state, 'A', 0);
      state = passTurn(state, T0 + 1_000);
      expect(state.activation.operativeStates.B).toEqual(Array(14).fill('ready'));
    });

    it('is a no-op once the passing player has no Ready operatives left', () => {
      let state = startAndResolveInitiative({ A: HOUR, B: HOUR }, { A: 2, B: 14 });
      state = cycleOperative(state, 'A', 0); // ready -> activated
      state = cycleOperative(state, 'A', 1); // ready -> activated
      const before = state.activation.operativeStates.A;
      state = passTurn(state, T0 + 1_000);
      expect(state.activation.operativeStates.A).toEqual(before);
    });

    it('does nothing when disabled at setup', () => {
      let state = startAndResolveInitiative({ A: HOUR, B: HOUR }, undefined, false);
      state = cycleOperative(state, 'A', 3);
      state = passTurn(state, T0 + 1_000);
      expect(state.activation.operativeStates.A[0]).toBe('ready');
      expect(state.activation.operativeStates.A[3]).toBe('activated');
    });
  });
});

describe('setSharedDepletion', () => {
  it('activates both players at half-rate each, so the combined clock drains 1:1 with real time', () => {
    let state = startAndResolveInitiative({ A: HOUR, B: HOUR });
    state = setSharedDepletion(state, true, T0 + 5_000); // A had the turn for 5s, then shared kicks in
    expect(state.activePlayers).toEqual(['A', 'B']);
    expect(state.players.A.accumulatedElapsedMs).toBe(5_000);

    const now = T0 + 5_000 + 20_000; // 20s of shared depletion
    // each player only loses half of the 20s = 10s
    expect(remainingMs(state, 'A', now)).toBe(HOUR - 5_000 - 10_000);
    expect(remainingMs(state, 'B', now)).toBe(HOUR - 10_000);
  });

  it('restores the previously active single player when turned off', () => {
    let state = startAndResolveInitiative({ A: HOUR, B: HOUR });
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
    let state = startAndResolveInitiative({ A: HOUR, B: HOUR });
    const beforeOff = passTurn(state, T0); // still just one active player
    const afterOffNoop = setSharedDepletion(beforeOff, false, T0 + 999);
    expect(afterOffNoop).toEqual(beforeOff);
  });
});

describe('togglePause', () => {
  it('freezes accumulation and resumes with the same active player(s)', () => {
    let state = startAndResolveInitiative({ A: HOUR, B: HOUR });
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
    let state = startAndResolveInitiative({ A: HOUR, B: HOUR });
    state = setSharedDepletion(state, true, T0);
    state = togglePause(state, T0 + 10_000);
    expect(state.activePlayers).toEqual([]);
    state = togglePause(state, T0 + 20_000);
    expect(state.activePlayers).toEqual(['A', 'B']);
  });
});

describe('resetToSetup', () => {
  it('returns a fresh setup-phase state regardless of prior progress', () => {
    let state = startAndResolveInitiative({ A: HOUR, B: HOUR });
    state = passTurn(state, T0 + 50_000);
    state = resetToSetup(state);
    expect(state).toEqual(createInitialState());
  });
});

describe('cycleOperative', () => {
  it('cycles a single operative Ready -> Activated -> Incapacitated -> Ready, leaving others untouched', () => {
    let state = startAndResolveInitiative({ A: HOUR, B: HOUR });
    state = cycleOperative(state, 'A', 2);
    expect(state.activation.operativeStates.A[2]).toBe('activated');
    expect(state.activation.operativeStates.A[1]).toBe('ready');

    state = cycleOperative(state, 'A', 2);
    expect(state.activation.operativeStates.A[2]).toBe('incapacitated');

    state = cycleOperative(state, 'A', 2);
    expect(state.activation.operativeStates.A[2]).toBe('ready');
  });

  it("doesn't affect the other player's row", () => {
    let state = startAndResolveInitiative({ A: HOUR, B: HOUR });
    state = cycleOperative(state, 'A', 0);
    expect(state.activation.operativeStates.B).toEqual(Array(14).fill('ready'));
  });
});

describe('toggleInitiative', () => {
  it('flips the initiative holder between A and B', () => {
    let state = startAndResolveInitiative({ A: HOUR, B: HOUR }); // A won the opening roll
    expect(state.activation.initiativeHolder).toBe('A');
    state = toggleInitiative(state);
    expect(state.activation.initiativeHolder).toBe('B');
    state = toggleInitiative(state);
    expect(state.activation.initiativeHolder).toBe('A');
  });
});

describe('advanceTurningPoint', () => {
  it('increments the turning point and resets Activated operatives back to Ready', () => {
    let state = startAndResolveInitiative({ A: HOUR, B: HOUR });
    state = cycleOperative(state, 'A', 0); // ready -> activated
    state = advanceTurningPoint(state, T0 + 10_000);
    expect(state.activation.turningPoint).toBe(2);
    expect(state.activation.operativeStates.A[0]).toBe('ready');
  });

  it('preserves Incapacitated operatives across the advance', () => {
    let state = startAndResolveInitiative({ A: HOUR, B: HOUR });
    state = cycleOperative(state, 'A', 0); // ready -> activated
    state = cycleOperative(state, 'A', 0); // activated -> incapacitated
    state = advanceTurningPoint(state, T0 + 10_000);
    expect(state.activation.operativeStates.A[0]).toBe('incapacitated');
  });

  it('is uncapped', () => {
    let state = startAndResolveInitiative({ A: HOUR, B: HOUR });
    let now = T0;
    for (let i = 0; i < 6; i++) {
      now += 1_000;
      state = advanceTurningPoint(state, now);
    }
    expect(state.activation.turningPoint).toBe(7);
  });

  it('puts both players into shared depletion and flags awaitingInitiative', () => {
    let state = startAndResolveInitiative({ A: HOUR, B: HOUR }); // A active solo
    state = advanceTurningPoint(state, T0 + 5_000);
    expect(state.activePlayers).toEqual(['A', 'B']);
    expect(state.activation.awaitingInitiative).toBe(true);

    // A's 5s of solo turn time was committed before shared depletion began
    expect(state.players.A.accumulatedElapsedMs).toBe(5_000);
    expect(state.players.B.accumulatedElapsedMs).toBe(0);
  });
});

describe('resolveInitiative', () => {
  it('sets the winner as initiative holder and sole active player, clearing awaitingInitiative', () => {
    let state = startAndResolveInitiative({ A: HOUR, B: HOUR });
    state = advanceTurningPoint(state, T0 + 5_000);
    state = resolveInitiative(state, 'B', T0 + 5_000 + 20_000); // 20s of shared depletion, 10s each

    expect(state.activation.awaitingInitiative).toBe(false);
    expect(state.activation.initiativeHolder).toBe('B');
    expect(state.activePlayers).toEqual(['B']);
    expect(state.players.A.accumulatedElapsedMs).toBe(5_000 + 10_000);
    expect(state.players.B.accumulatedElapsedMs).toBe(10_000);
  });

  it('is a no-op when not awaiting initiative', () => {
    const state = startAndResolveInitiative({ A: HOUR, B: HOUR });
    expect(resolveInitiative(state, 'B', T0 + 1_000)).toEqual(state);
  });
});
