import { useLayoutEffect, useState, type RefObject } from 'react';
import type { OperativeState, PlayerId } from '../timer/types';
import { countCounteracts } from './scenarios';

interface Marker {
  x: number;
  y: number;
}

/** Parsed centre of one operative circle, relative to the grid container. */
interface Dot {
  index: number;
  state: OperativeState;
  cx: number;
  cy: number;
  size: number;
}

function readDots(container: HTMLElement, player: PlayerId): Dot[] {
  const box = container.getBoundingClientRect();
  const buttons = container.querySelectorAll<HTMLElement>(`button[aria-label^="Player ${player} operative"]`);
  const dots: Dot[] = [];
  buttons.forEach((btn) => {
    const match = btn.getAttribute('aria-label')?.match(/operative (\d+): (\w+)/);
    if (!match) return;
    const r = btn.getBoundingClientRect();
    dots.push({
      index: Number(match[1]) - 1,
      state: match[2] as OperativeState,
      cx: r.left - box.left + r.width / 2,
      cy: r.top - box.top + r.height / 2,
      size: r.width,
    });
  });
  return dots.sort((a, b) => a.index - b.index);
}

/**
 * Draws amber markers over the grid's negative space: each empty slot that
 * sits between two of the opponent's adjacent Ready circles — a counteraction
 * the viewer may receive. Markers are positioned by measuring the real circle
 * DOM (so they line up exactly, whatever the width), but the headline count
 * comes from `countCounteracts` on the state, so it is always correct even
 * where layout can't be measured (e.g. tests).
 */
export function CounteractAnnotations({
  containerRef,
  operativeStates,
  initiativeHolder,
  viewer,
  signature,
}: {
  containerRef: RefObject<HTMLElement>;
  operativeStates: Record<PlayerId, OperativeState[]>;
  initiativeHolder: PlayerId;
  viewer: PlayerId;
  /** Bump to force a re-measure when the grid changes. */
  signature: string;
}) {
  const [markers, setMarkers] = useState<Marker[]>([]);
  const count = countCounteracts(operativeStates, initiativeHolder, viewer);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const you = readDots(container, viewer);
      const them = readDots(container, viewer === 'A' ? 'B' : 'A');
      const viewerOffset = initiativeHolder !== viewer;
      if (them.length === 0) return setMarkers([]);

      const midY = you.length > 0 ? (you[0].cy + them[0].cy) / 2 : them[0].cy;
      const next: Marker[] = [];
      for (let j = 0; j + 1 < them.length; j++) {
        if (them[j].state === 'ready' && them[j + 1].state === 'ready') {
          const yourSlot = viewerOffset ? j : j + 1;
          const hasCounteract = (yourSlot >= you.length || you[yourSlot].state !== 'ready') && j > you.length;
          const mx = (them[j].cx + them[j + 1].cx) / 2;
          if (hasCounteract) {
            next.push({ x: mx, y: midY });
          }
        }
      }
      setMarkers(next);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, viewer, initiativeHolder, signature]);

  return (
    <>
      {markers.map((m, i) => (
        <span
          key={i}
          aria-hidden
          className="pointer-events-none absolute -translate-x-3 text-xl"
          style={{ left: m.x, top: m.y}}
        >☝</span>
      ))}
      <span
        className="pointer-events-none absolute -top-1 right-1 rounded-full bg-amber-300 px-2 py-0.5 text-xs font-semibold text-neutral-900"
        aria-label={`${count} counteractions available`}
      >
        ≈ {count} counteract{count === 1 ? '' : 's'}
      </span>
    </>
  );
}
