import { useRef, useState } from 'react';

const LONG_PRESS_MS = 350;
const MOVE_TOLERANCE_PX = 10;

/**
 * Distinguishes a tap from a long-press, firing the resulting action only on
 * release — not mid-hold. This is a deliberate structural choice: if
 * `onLongPress` instead fired while the finger was still down (e.g. to open
 * a menu), the finger would still be resting on the screen at that moment,
 * and whatever the long-press revealed could end up right underneath it,
 * making the eventual release land a stray click/tap on it. Several attempts
 * at suppressing/retargeting that click (setPointerCapture, preventDefault,
 * pointer-events gating) didn't hold up on iOS WebKit, whose touch-to-click
 * synthesis is documented as unreliable in this exact scenario — so instead,
 * nothing the long-press reveals exists until the finger is already off the
 * glass. `holding` is exposed for lightweight "still mid-hold" visual
 * feedback (e.g. dimming) that doesn't itself need to be interactive.
 *
 * `onClick` is kept only as a fallback for keyboard activation (Enter/Space
 * on a focused button fires `click` directly, with no preceding pointer
 * events). `pointerHandled` suppresses that fallback from double-firing for
 * the mouse case, where native click is a primary event that still fires
 * after our own pointerup-driven handling.
 */
export function useLongPress(onTap: () => void, onLongPress: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const heldPastThreshold = useRef(false);
  const movedTooFar = useRef(false);
  const pointerHandled = useRef(false);
  const [holding, setHolding] = useState(false);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const reset = () => {
    clearTimer();
    heldPastThreshold.current = false;
    movedTooFar.current = false;
    start.current = null;
    setHolding(false);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
    heldPastThreshold.current = false;
    movedTooFar.current = false;
    clearTimer();
    timer.current = setTimeout(() => {
      heldPastThreshold.current = true;
      setHolding(true);
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current || movedTooFar.current) return;
    const dx = Math.abs(e.clientX - start.current.x);
    const dy = Math.abs(e.clientY - start.current.y);
    if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) {
      movedTooFar.current = true;
      clearTimer();
      setHolding(false);
    }
  };

  const onPointerUp = () => {
    const wasHeld = heldPastThreshold.current;
    const moved = movedTooFar.current;
    reset();
    pointerHandled.current = true;
    if (moved) return;
    if (wasHeld) onLongPress();
    else onTap();
  };

  const onPointerCancel = () => reset();

  const onClick = () => {
    if (pointerHandled.current) {
      pointerHandled.current = false;
      return;
    }
    onTap();
  };

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClick, holding };
}
