import type { ActivationPhase, OperativeState, PersistedGameState, PlayerId } from '../timer/types';

const HOUR_MS = 60 * 60 * 1000;

/** A row of `n` ready operatives, with the listed indices overridden. */
function row(n: number, overrides: Partial<Record<number, OperativeState>> = {}): OperativeState[] {
  return Array.from({ length: n }, (_, i) => overrides[i] ?? 'ready');
}

interface SceneOptions {
  phase: ActivationPhase;
  active: PlayerId[];
  initiativeHolder: PlayerId;
  turningPoint?: number;
  states?: Record<PlayerId, OperativeState[]>;
  autoActivateOnPass?: boolean;
}

/**
 * Builds a full, self-consistent `PersistedGameState` for a tutorial step.
 * Times start from a fixed 2-hour-each budget; `turnStartTimestamp` is stamped
 * at build time so whichever clock is active ticks down from full. This is a
 * tutorial-only duplicate of the shape the real engine produces — it never
 * touches persistence.
 */
function scene({
  phase,
  active,
  initiativeHolder,
  turningPoint = 1,
  states = { A: row(9), B: row(9) },
  autoActivateOnPass = true,
}: SceneOptions): PersistedGameState {
  const budget = 1 * HOUR_MS - 1000; // 1 hour each, minus a tiny bit so the clock doesn't start at exactly 1:00:00.000
  return {
    schemaVersion: 5,
    phase: 'active',
    players: {
      A: { totalBudgetMs: budget, accumulatedElapsedMs: 0 },
      B: { totalBudgetMs: budget, accumulatedElapsedMs: 0 },
    },
    activePlayers: active,
    turnStartTimestamp: active.length > 0 ? Date.now() : null,
    pausedActivePlayers: null,
    preSharedActivePlayer: null,
    activation: {
      operativeCounts: { A: states.A.length, B: states.B.length },
      operativeStates: states,
      initiativeHolder,
      turningPoint,
      activationPhase: phase,
      autoActivateOnPass,
    },
  };
}

/** Firefight backdrop, Player A active, fresh trackers — used behind card-only steps. */
export const sceneBackdrop = (): PersistedGameState =>
  scene({ phase: 'firefight', active: ['A'], initiativeHolder: 'A' });

/** Player A alone on the clock; tapping A's zone passes to B (auto-activate off to keep the lesson pure). */
export const scenePass = (): PersistedGameState =>
  scene({ phase: 'firefight', active: ['A'], initiativeHolder: 'A', autoActivateOnPass: false });

/** Both players in shared depletion, rolling for initiative. */
export const sceneInitiative = (): PersistedGameState =>
  scene({ phase: 'initiative', active: ['A', 'B'], initiativeHolder: 'B', turningPoint: 1 });

/** Player A won initiative; strategy phase, A's clock running. */
export const sceneStrategy = (): PersistedGameState =>
  scene({ phase: 'strategy', active: ['A'], initiativeHolder: 'A' });

/** Firefight, A active, fresh trackers — the activation grid appears. */
export const sceneFirefight = (): PersistedGameState =>
  scene({ phase: 'firefight', active: ['A'], initiativeHolder: 'A' });

/** Firefight 2, A active, fresh trackers — the activation grid appears. */
export const sceneFirefight2 = (): PersistedGameState =>
  scene({
    phase: 'firefight',
    active: ['A'],
    initiativeHolder: 'B',
    states: {
      A: row(5, { 0: 'activated', 1: 'activated' }),
      B: row(9, { 0: 'activated', 1: 'activated', 2: 'activated' }),
    },
  });

/**
 * Counteract lesson. B (opponent, holds initiative, aligned left) keeps four
 * ready operatives on the left; A (you, offset) has spent the three that would
 * interleave among them. Result: three empty slots each sitting between two of
 * B's ready circles — three counteractions you may receive.
 */
export const sceneCounteract = (): PersistedGameState =>
  scene({
    phase: 'firefight',
    active: ['B'],
    initiativeHolder: 'B',
    states: {
      A: row(5, { 0: 'activated', 1: 'activated', 2: 'activated' }),
      B: row(9, { 0: 'activated', 1: 'activated', 2: 'activated' }),
    },
  });

/** Menu lesson backdrop: firefight, A active, so the menu opens over a live game. */
export const sceneMenu = (): PersistedGameState =>
  scene({ phase: 'firefight', active: ['B'], initiativeHolder: 'A' });

/** A whole tracker of `n` expended operatives — the end-of-turning-point state. */
const allExpended = (n: number): OperativeState[] => Array.from({ length: n }, () => 'activated');

/** End of the turning point: every operative on both sides has activated, ready to advance. */
export const sceneNextTurn = (): PersistedGameState =>
  scene({
    phase: 'firefight',
    active: ['A'],
    initiativeHolder: 'A',
    states: { A: allExpended(5).concat(['incapacitated', 'incapacitated']), B: allExpended(5) },
  });

/**
 * Pure count of counteractions the viewer may receive, read the way the
 * tracker shows it: an empty slot (no ready operative of yours) sitting
 * between two of the opponent's adjacent ready circles. Mirrors the half-circle
 * offset — the opponent-aligned viewer reads the slot to the right of each
 * opponent pair, the offset viewer the slot to the left. This is a guide: real
 * rules the app can't see (e.g. group activation) can change the true number.
 */
export function countCounteracts(
  operativeStates: Record<PlayerId, OperativeState[]>,
  initiativeHolder: PlayerId,
  viewer: PlayerId,
): number {
  const opponent: PlayerId = viewer === 'A' ? 'B' : 'A';
  const you = operativeStates[viewer];
  const them = operativeStates[opponent];
  const viewerOffset = initiativeHolder !== viewer;

  let count = 0;
  for (let j = 0; j + 1 < them.length; j++) {
    if (them[j] !== 'ready' || them[j + 1] !== 'ready') continue;
    const yourSlot = viewerOffset ? j : j + 1;
    const hasCounteract = (yourSlot >= you.length || you[yourSlot] === 'incapacitated')
    if (hasCounteract) count++;
  }
  return count;
}
