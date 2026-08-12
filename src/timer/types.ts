export type PlayerId = 'A' | 'B';

export interface PlayerState {
  totalBudgetMs: number;
  accumulatedElapsedMs: number;
}

/**
 * Persisted shape, per the state model spec (KTTime issue #3, amended for the
 * shared-depletion rate correction). `activePlayers` unifies paused ([]),
 * a normal turn (one player), and shared-depletion mode (both players) under
 * a single Date.now()-based reconciliation formula.
 */
export interface PersistedGameState {
  schemaVersion: 1;
  phase: 'setup' | 'active';
  players: Record<PlayerId, PlayerState>;
  activePlayers: PlayerId[];
  turnStartTimestamp: number | null;
  /** Remembered so `togglePause` can restore who was active on resume. */
  pausedActivePlayers: PlayerId[] | null;
  /** Remembered so turning shared-depletion off returns to the right player. */
  preSharedActivePlayer: PlayerId | null;
}
