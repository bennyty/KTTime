import { useLayoutEffect, useRef, useState } from 'react';

const CIRCLES_PER_ROW = 14;

/**
 * Placeholder tap-target grid for the reserved center band (KTTime issue #5's
 * winning prototype): two rows of 14 circles, second row offset by exactly
 * one circle's radius. Not functional yet — the phase-2 game-state UI is a
 * separate future effort — but the interaction surface (a grid of evenly
 * sized circular targets filling the band's width) is established here.
 */
export function CircleGrid() {
  const rowRef = useRef<HTMLDivElement>(null);
  const [radiusPx, setRadiusPx] = useState(0);

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    const measure = () => {
      const firstCircle = row.firstElementChild as HTMLElement | null;
      if (firstCircle) setRadiusPx(firstCircle.getBoundingClientRect().width / 2);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  const circleClass = 'flex-1 aspect-square rounded-full bg-white/10';

  return (
    <div className="flex w-full flex-col gap-1 px-3">
      <div ref={rowRef} className="flex w-full gap-1">
        {Array.from({ length: CIRCLES_PER_ROW }, (_, i) => (
          <div key={i} className={circleClass} />
        ))}
      </div>
      <div className="flex gap-1" style={{ marginLeft: radiusPx, width: `calc(100% - ${radiusPx}px)` }}>
        {Array.from({ length: CIRCLES_PER_ROW }, (_, i) => (
          <div key={i} className={circleClass} />
        ))}
      </div>
    </div>
  );
}
