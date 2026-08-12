# Mobile browser lifecycle behavior for the timing engine

Research for [issue #2](https://github.com/bennyty/KTTime/issues/2). Scope: iOS Safari and Android
Chrome, the two realistic mobile targets for KTTime's pass-and-tap chess clock. Goal: confirm the
lifecycle events to hook and the pitfalls to design around for the `Date.now() - startTimestamp` +
localStorage persistence architecture.

## 1. Lifecycle events: what fires, in what order, how reliably

### The core, well-supported events

- **`visibilitychange`** (fires on `document`) — Baseline widely available since April 2021. Fires
  when the tab is backgrounded (app-switch), the screen is locked, or the user switches tabs. This
  is the **single most reliable signal** available on mobile. Per the WICG spec and web.dev: *"the
  transition to hidden is often the last state change reliably observable by developers... this is
  especially true on mobile, as users can close tabs or the browser app itself, and the
  `beforeunload`, `pagehide`, and `unload` events are not fired in those cases."*
- **`pagehide`** (fires on `window`) — Fires when a page is unloaded or placed into the
  back/forward cache (bfcache). It is bfcache-safe (unlike `unload`), and has a `persisted`
  property indicating whether the page was frozen into bfcache (`true`) vs. actually being torn
  down (`false`). **Not reliably fired on mobile** in the specific case where the user backgrounds
  the tab, switches away, and then the OS/user kills the browser app itself from the app switcher —
  in that scenario the process is simply halted and no more JS runs, so nothing after backgrounding
  is guaranteed to fire.
- **`pageshow`** (fires on `window`) — Fires on initial load and again when a page is restored from
  bfcache. Check `event.persisted === true` to detect a bfcache restore (state may be stale and
  should be re-validated/re-synced from localStorage in that case).
- **`beforeunload`** / **`unload`** — Unreliable on mobile and actively harmful: attaching an
  `unload` listener makes desktop Chrome/Firefox pages bfcache-ineligible (Safari and mobile
  browsers are more forgiving and may still cache the page but simply won't run the handler).
  **Recommendation: do not use `beforeunload`/`unload` at all.**

### The Page Lifecycle API's `freeze`/`resume`

- `freeze` (fires on `document`) marks the transition into a frozen/bfcache state; `resume` marks
  unfreezing. These are **Chromium-only** — supported in Android Chrome, but Safari (desktop and
  iOS) does not implement `freeze`/`resume` at all. The same frozen/resumed transition is still
  observable on Safari via `pagehide`/`pageshow` (with `persisted: true`), just without the
  dedicated event names.
- `document.wasDiscarded` lets a page detect, on load, that it was previously discarded by the OS
  to reclaim memory — but a discard itself fires no event; you only learn about it after the fact
  on the next load. This is Chromium-only.

### Confirmed event ordering (going to background, Chromium/Chrome-based)

1. `visibilitychange` → `document.visibilityState === "hidden"`
2. `pagehide` (with `persisted: true` if entering bfcache)
3. `freeze` (Chromium only)

### Confirmed event ordering (coming back to foreground)

1. `resume` (Chromium only, if it was frozen)
2. `pageshow` (with `persisted: true` if restored from bfcache)
3. `visibilitychange` → `document.visibilityState === "visible"`

### Mobile-specific worst case (both platforms)

User backgrounds the tab, then closes the browser app entirely from the OS app switcher (or iOS
reclaims it under memory pressure). In this case **only `visibilitychange` → hidden is guaranteed
to have fired**; `pagehide`, `freeze`, `unload`, and `beforeunload` may never run. This is the
scenario that matters most for correctness: any state that must survive has to already be
persisted by the time `visibilitychange` fires, not deferred to a later "close" event, because
there is no reliable later event on mobile.

**Confirmed hook list:**
- `visibilitychange` — primary, mandatory. Persist state here on every transition to hidden.
- `pagehide` — secondary/defense-in-depth, cheap to also persist here (bfcache-safe, unlike
  `unload`).
- `pageshow` — use to detect bfcache restores (`event.persisted`) and re-hydrate/re-validate
  in-memory state from localStorage/timestamps rather than trusting stale in-memory JS state.
- `freeze`/`resume` — nice-to-have on Chromium (Android Chrome) for closing any live
  connections/timers, but not load-bearing for this app since we don't hold connections and don't
  rely on background execution. Not available on Safari at all, so cannot be depended on.
- `beforeunload`/`unload` — do not use.

## 2. Does `Date.now()` keep advancing correctly across sleep/backgrounding?

Yes — and this is the key reason the architecture's choice of `Date.now()` (wall-clock time) over
`performance.now()` (monotonic/high-resolution time) is correct.

- `performance.now()`, the monotonic clock, is documented to **not reliably tick during device
  sleep/suspend** on several platform/browser combinations, particularly on mobile. When the
  monotonic clock pauses during suspend but the wall clock keeps advancing, `Date.now()` and
  `performance.now()`-derived values can drift apart by hours or even days across a suspend cycle
  (confirmed in W3C High Resolution Time spec discussion, `w3c/hr-time` issue tracker, and a
  related Firefox/Mozilla bug on `TimeStamp::Now()` behavior across sleep).
  - Root cause on the OS side: `CLOCK_MONOTONIC` does not increment during suspend on some systems
    (notably Android); Android added `ANDROID_ALARM_ELAPSED_REALTIME` specifically because
    `CLOCK_MONOTONIC` freezes during suspend and app developers needed a clock that keeps counting.
  - `Date.now()`, by contrast, is wall-clock (`CLOCK_REALTIME`-equivalent) and is defined to
    represent real elapsed calendar time — it keeps advancing correctly across sleep/suspend/
    backgrounding on both iOS Safari and Android Chrome, because it's reading the system's actual
    clock/calendar time, not an uptime counter.
- Caveat (low practical risk for this app): `Date.now()` is wall-clock, so it is subject to
  clock adjustments (manual time changes, NTP sync, DST) in principle. For a single-device,
  session-scoped, pass-and-tap game clock this is an acceptable, extremely rare edge case, not
  worth engineering around.

**Conclusion: the architecture's use of `Date.now() - startTimestamp` instead of interval-tick
counting or `performance.now()` deltas is confirmed correct and is exactly the right way to avoid
the sleep/suspend clock-skew problem documented above.**

## 3. Screen Wake Lock API (`navigator.wakeLock`)

### Support

- **iOS Safari:** supported starting Safari 16.4+, but **only in the regular Safari browser tab —
  not for PWAs installed to the home screen** (per WebKit-adjacent PWA capability tracking at
  whatpwacando.today). If KTTime is ever added-to-home-screen on iOS, wake lock silently stops
  being available in that mode.
- **Android Chrome:** supported (Chrome 84+ on Android per Chrome's own rollout; broadly available
  in current Chrome for Android).
- The wake lock is **automatically released whenever the document becomes hidden/inactive** — i.e.
  it cannot keep a backgrounded/locked-screen tab "alive" or running JS. MDN's own example shows
  re-requesting the lock on `visibilitychange` → visible, which underscores that the lock only
  applies while the page is foregrounded and visible; it does nothing once the user backgrounds the
  tab or locks the screen.

### Is it useful here?

**Yes, but only for UX, not correctness.** Given the app's architecture already computes elapsed
time as `Date.now() - startTimestamp` and never trusts `setInterval` ticks or requires background
JS execution, correctness of the clock does not depend on the screen staying on or the tab staying
foregrounded in any way — the recomputation approach is exactly what makes wake lock unnecessary
for correctness. Its only value is preventing the screen from auto-dimming/locking *while the app
is actively in the foreground* mid-match, which is a real and common annoyance for a pass-and-tap
game sitting on a table between rounds (nobody is touching the screen for tens of seconds while a
player thinks, so the OS's idle screen-lock timer would otherwise kick in).

**Recommendation:** Adopt Wake Lock as a **progressive-enhancement UX nicety**, not a
correctness dependency:
- Request the lock when a game/turn is active and the page is visible; release it when the game is
  paused/ended or the page goes hidden (re-request on the `visibilitychange` → visible transition,
  per MDN's documented pattern, since iOS releases it automatically on backgrounding anyway).
- Feature-detect (`'wakeLock' in navigator`) and no-op silently where unsupported (this also
  quietly covers the iOS home-screen-PWA gap without special-casing it).
- Never gate any timing logic, state persistence, or turn-elapsed calculation on whether the lock
  was successfully acquired.

## 4. Reliability of `localStorage.setItem()` inside `visibilitychange`/`pagehide` handlers

- `localStorage.setItem()` is a **synchronous** API by spec — it blocks the calling thread until
  the write completes; there is no async/pending state to "lose" mid-call the way there can be with
  something like `IndexedDB` transactions or `fetch`/`sendBeacon`. Because `visibilitychange` and
  `pagehide` handlers run synchronously to completion before the browser proceeds with
  backgrounding/freezing the page, a `setItem()` call made directly inside those handlers is safe
  from being interrupted mid-write by the transition itself.
- The **general web guidance** (web.dev, Page Lifecycle spec, common practice for
  games/editors persisting state) is explicitly to treat `visibilitychange` → hidden as the primary
  "commit state now" checkpoint, precisely because it's the last reliably observable event on
  mobile — this matches KTTime's plan of writing to localStorage on every state transition anyway
  (not only in a lifecycle handler), which further de-risks this.
- **What is *not* guaranteed** is a scenario unrelated to the synchronous nature of `setItem()`
  itself: broader iOS Safari data-integrity bugs where localStorage for a site is unexpectedly
  cleared or reset (reported on Apple Developer Forums for iOS 13/16, WKWebView contexts, and
  under low device memory or storage quota pressure e.g. ~2.5MB write limits triggering silent
  clearing on iOS 16). These are OS/engine-level storage bugs, not lifecycle-event-timing bugs, and
  they're orthogonal to whether the write happens inside a lifecycle handler — they're a reason to
  keep persisted state minimal (as the architecture already plans: whose turn, turn-start
  timestamp, accumulated time per player) and to treat localStorage as best-effort rather than a
  guaranteed durable store, but not a reason to avoid writing from lifecycle handlers.
- **Practical implication for KTTime:** because the state to persist is written continuously
  anyway (on every turn change, not just on backgrounding), the lifecycle handlers don't need to
  carry the sole responsibility of the "final save" — they're a reinforcing checkpoint, not a
  last-resort save path. This further reduces exposure to any hypothetical write-not-flushed edge
  case.

## Recommendations summary

1. **Hook `visibilitychange`** (mandatory, primary signal — the only mobile-reliable lifecycle
   event) to persist current state (`whoseTurn`, `turnStartTimestamp`, `accumulatedElapsedByPlayer`)
   to localStorage whenever `document.visibilityState === "hidden"`.
2. **Hook `pagehide`** as cheap defense-in-depth (bfcache-safe); do not use `beforeunload`/`unload`.
3. **Hook `pageshow`**, checking `event.persisted`, to re-hydrate/re-validate state from
   localStorage on bfcache restores rather than trusting in-memory JS state that may be stale.
4. Treat `freeze`/`resume` as Chromium-only nice-to-haves for releasing any live resources — not
   load-bearing, since KTTime holds no connections and Safari doesn't implement them anyway.
5. Continue computing elapsed time as `Date.now() - startTimestamp` on every render/recompute
   rather than tick-counting or using `performance.now()` — confirmed as the correct approach; this
   is precisely what sidesteps the documented monotonic-clock-pause-during-sleep problem.
6. Adopt Screen Wake Lock (`navigator.wakeLock`) as a **progressive-enhancement UX feature only**
   (prevent screen dimming during an active foregrounded game), with feature detection and no
   dependency on it for correctness. Note it won't work for an iOS home-screen-installed PWA.
7. Persist state continuously (on every state transition, not only in lifecycle handlers) so that
   the lifecycle handlers are a reinforcing checkpoint rather than a single point of failure —
   this also mitigates exposure to rare iOS localStorage-clearing bugs unrelated to lifecycle
   timing.

## Sources

- [Page Lifecycle API | Web Platform | Chrome for Developers](https://developer.chrome.com/docs/web-platform/page-lifecycle-api)
- [Page Lifecycle — WICG spec](https://wicg.github.io/page-lifecycle/)
- [GitHub - WICG/page-lifecycle](https://github.com/WICG/page-lifecycle)
- [Window: pagehide event - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/pagehide_event)
- [web.dev: Back/forward cache (bfcache)](https://web.dev/articles/bfcache)
- [Document: visibilitychange event - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event)
- [Screen Wake Lock API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API)
- [Screen Wake Lock — Can I Use](https://caniuse.com/wake-lock)
- [What PWA Can Do Today: Wake Lock](https://whatpwacando.today/wake-lock/)
- [w3c/hr-time issue #115: ticking during sleep, skew definition](https://github.com/w3c/hr-time/issues/115)
- [High Resolution Time Level 2 — W3C](https://www.w3.org/TR/hr-time-2/)
- [Bugzilla 1204823: TimeStamp::Now() behavior across sleep](https://bugzilla.mozilla.org/show_bug.cgi?id=1204823)
- [GoogleChromeLabs/page-lifecycle issue #2: Safari pagehide/visibilitychange gaps](https://github.com/GoogleChromeLabs/page-lifecycle/issues/2)
- Apple Developer Forums: iOS Safari localStorage clearing reports (iOS 13/16, WKWebView, low
  memory/quota) — https://developer.apple.com/forums/thread/715380 ,
  https://developer.apple.com/forums/thread/125041
