import { useState } from 'react';
import type { useGameClock } from '../hooks/useGameClock';
import type { PlayerId } from '../timer/types';
import { CenterBand } from './CenterBand';
import { MenuSheet } from './MenuSheet';
import { PlayerZone } from './PlayerZone';

type GameClock = ReturnType<typeof useGameClock>;

export function ClockScreen({ clock }: { clock: GameClock }) {
  // Only one player's menu can be showing at a time — a single value rather
  // than a per-player flag means opening one implicitly dismisses the other.
  const [activeMenu, setActiveMenu] = useState<PlayerId | null>(null);
  const closeMenu = () => setActiveMenu(null);

  const {
    state,
    remaining,
    passTurn,
    setSharedDepletion,
    togglePause,
    reset,
    cycleOperative,
    toggleInitiative,
    advanceTurningPoint,
    resolveInitiative,
    endStrategyPhase,
  } = clock;

  const isShared = state.activePlayers.length === 2;
  const isPaused = state.activePlayers.length === 0;
  const awaitingInitiative = state.activation.activationPhase === 'initiative';

  // While in the initiative phase (just after starting the game or advancing
  // a turning point), tapping either zone declares that player the winner
  // instead of the normal pass-turn behavior. Otherwise, a player's own zone
  // only passes the turn when they're the sole active player — during shared
  // depletion or while paused, tapping is a no-op (the menu is the only way to
  // change those modes).
  const handleTap = (player: 'A' | 'B') => {
    if (awaitingInitiative) {
      resolveInitiative(player);
      return;
    }
    if (state.activePlayers.length === 1 && state.activePlayers[0] === player) {
      passTurn();
    }
  };

  const menuDisplayProps = {
    isPaused,
    isShared,
    turningPoint: state.activation.turningPoint,
    initiativeHolder: state.activation.initiativeHolder,
  };

  const menuActions = {
    onTogglePause: () => {
      togglePause();
      closeMenu();
    },
    onToggleShared: () => {
      setSharedDepletion(!isShared);
      closeMenu();
    },
    onReset: () => {
      reset();
      closeMenu();
    },
    onAdvanceTurningPoint: () => {
      advanceTurningPoint();
      closeMenu();
    },
    onToggleInitiative: () => {
      toggleInitiative();
      closeMenu();
    },
    onClose: closeMenu,
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
        onLongPress={() => setActiveMenu('B')}
      />
      <CenterBand
        operativeStates={state.activation.operativeStates}
        initiativeHolder={state.activation.initiativeHolder}
        turningPoint={state.activation.turningPoint}
        activationPhase={state.activation.activationPhase}
        onCycleOperative={cycleOperative}
        onEndStrategyPhase={endStrategyPhase}
      />
      <PlayerZone
        player="A"
        remainingMs={remaining('A')}
        isActive={state.activePlayers.includes('A')}
        isShared={isShared}
        flipped={false}
        onTap={() => handleTap('A')}
        onLongPress={() => setActiveMenu('A')}
      />
      {activeMenu !== null && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-10 mx-auto max-w-4xl"
          onClick={closeMenu}
        />
      )}
      <MenuSheet origin="B" visible={activeMenu === 'B'} {...menuDisplayProps} {...menuActions} />
      <MenuSheet origin="A" visible={activeMenu === 'A'} {...menuDisplayProps} {...menuActions} />
    </div>
  );
}
