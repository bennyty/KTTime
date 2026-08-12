import type { PersistedGameState } from './types';
import { saveState } from './persistence';

/**
 * Thin glue over the browser lifecycle events confirmed in the KTTime issue #2
 * research: `visibilitychange` -> hidden is the only mobile-reliable signal, so
 * it's the mandatory checkpoint save. `pagehide` is cheap defense-in-depth.
 * `pageshow` with `event.persisted` (a bfcache restore) re-hydrates from
 * localStorage rather than trusting potentially-stale in-memory state.
 * `beforeunload`/`unload` are deliberately not used (unreliable on mobile,
 * actively harmful to bfcache eligibility).
 */
export function registerLifecyclePersistence(
  getState: () => PersistedGameState,
  onBfcacheRestore: () => void,
): () => void {
  const save = () => saveState(getState());

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') save();
  };
  const handlePageHide = () => save();
  const handlePageShow = (event: PageTransitionEvent) => {
    if (event.persisted) onBfcacheRestore();
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', handlePageHide);
  window.addEventListener('pageshow', handlePageShow);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pagehide', handlePageHide);
    window.removeEventListener('pageshow', handlePageShow);
  };
}
