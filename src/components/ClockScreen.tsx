import { useState } from 'react';
import type { useGameClock } from '../hooks/useGameClock';
import { CenterBand } from './CenterBand';
import { MenuSheet } from './MenuSheet';
import { PlayerZone } from './PlayerZone';

type GameClock = ReturnType<typeof useGameClock>;

export function ClockScreen({ clock }: { clock: GameClock }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { state, remaining, passTurn, setSharedDepletion, togglePause, reset } = clock;

  const isShared = state.activePlayers.length === 2;
  const isPaused = state.activePlayers.length === 0;

  // A player's own zone only passes the turn when they're the sole active
  // player — during shared depletion or while paused, tapping is a no-op
  // (the menu is the only way to change those modes).
  const handleTap = (player: 'A' | 'B') => {
    if (state.activePlayers.length === 1 && state.activePlayers[0] === player) {
      passTurn();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PlayerZone
        player="B"
        remainingMs={remaining('B')}
        isActive={state.activePlayers.includes('B')}
        isShared={isShared}
        flipped
        onTap={() => handleTap('B')}
      />
      <CenterBand onOpenMenu={() => setMenuOpen(true)} />
      <PlayerZone
        player="A"
        remainingMs={remaining('A')}
        isActive={state.activePlayers.includes('A')}
        isShared={isShared}
        flipped={false}
        onTap={() => handleTap('A')}
      />
      {menuOpen && (
        <MenuSheet
          isPaused={isPaused}
          isShared={isShared}
          onTogglePause={() => {
            togglePause();
            setMenuOpen(false);
          }}
          onToggleShared={() => {
            setSharedDepletion(!isShared);
            setMenuOpen(false);
          }}
          onReset={() => {
            reset();
            setMenuOpen(false);
          }}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}
