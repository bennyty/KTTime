import type { PersistedGameState } from './types';

const STORAGE_KEY = 'kttime.gameState.v1';

/**
 * localStorage is treated as best-effort per the lifecycle research (issue #2):
 * rare iOS storage-clearing bugs are orthogonal to write timing, so failures
 * here are swallowed rather than surfaced — there's nothing more correct to
 * do than skip the read/write and fall back to a fresh state.
 */
export function loadState(): PersistedGameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedGameState;
    if (parsed.schemaVersion !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state: PersistedGameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // best-effort — see comment above
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // best-effort — see comment above
  }
}
