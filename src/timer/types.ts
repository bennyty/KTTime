export type PlayerId = 'A' | 'B';

export interface PlayerState {
  totalBudgetMs: number;
  accumulatedElapsedMs: number;
}

export type OperativeState = 'ready' | 'activated' | 'incapacitated';

/**
 * Activation tracking for the reserved center band (KTTime issue #6/#7).
 * `operativeCounts` comes from setup (5-14 per player); `operativeStates`
 * mirrors it 1:1, one entry per operative. `initiativeHolder` controls which
 * row is nudged for the half-circle offset. `turningPoint` is explicit and
 * uncapped — advancing it resets `activated` operatives back to `ready` but
 * preserves `incapacitated` ones, and also puts both players into shared
 * depletion with `awaitingInitiative` true: the center band covers the
 * circle grid with a "tap the winner" prompt until a player is tapped,
 * which resolves initiative and hands the clock to that player.
 *
 * `autoActivateOnPass` (set at setup, default on) is a forgiveness feature:
 * if any operative on either side is already Activated this turning point
 * (so activation tracking is "in use"), passing the turn auto-marks the
 * passing player's left-most Ready operative as Activated too, in case they
 * forgot to tap it before passing.
 */
export interface ActivationState {
  operativeCounts: Record<PlayerId, number>;
  operativeStates: Record<PlayerId, OperativeState[]>;
  initiativeHolder: PlayerId;
  turningPoint: number;
  awaitingInitiative: boolean;
  autoActivateOnPass: boolean;
}

/**
 * Persisted shape, per the state model spec (KTTime issue #3, amended for the
 * shared-depletion rate correction). `activePlayers` unifies paused ([]),
 * a normal turn (one player), and shared-depletion mode (both players) under
 * a single Date.now()-based reconciliation formula.
 */
export interface PersistedGameState {
  schemaVersion: 4;
  phase: 'setup' | 'active';
  players: Record<PlayerId, PlayerState>;
  activePlayers: PlayerId[];
  turnStartTimestamp: number | null;
  /** Remembered so `togglePause` can restore who was active on resume. */
  pausedActivePlayers: PlayerId[] | null;
  /** Remembered so turning shared-depletion off returns to the right player. */
  preSharedActivePlayer: PlayerId | null;
  activation: ActivationState;
}
