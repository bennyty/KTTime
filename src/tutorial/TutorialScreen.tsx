import { useEffect, useState } from 'react';
import type { PlayerId } from '../timer/types';
import { STEPS } from './steps';
import { TutorialClockScene } from './TutorialClockScene';
import { TutorialOverlay } from './TutorialOverlay';
import { useTutorialClock } from './useTutorialClock';

/**
 * Self-contained, opt-in walkthrough. Reachable only from the setup screen and
 * never auto-launched. It drives its own non-persistent clock through a scripted
 * turning point, gating each step's "Next" behind the action it teaches. Exiting
 * returns to setup with the real game untouched.
 */
export function TutorialScreen({ onExit }: { onExit: () => void }) {
  const clock = useTutorialClock(STEPS[0].scenario());
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [menuOpen, setMenuOpen] = useState<PlayerId | null>(null);

  const step = STEPS[index];

  // Entering a step (forward or back) resets it to its scripted state, so Back
  // is always reliable and a fumbled interaction can't strand the lesson.
  useEffect(() => {
    clock.loadScenario(step.scenario());
    setDone(!step.require);
    setMenuOpen(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const goNext = () => (index === STEPS.length - 1 ? onExit() : setIndex((i) => i + 1));
  const goBack = () => setIndex((i) => Math.max(0, i - 1));

  const handleZoneTap = (player: PlayerId) => {
    if (step.require === 'tapWinner') {
      clock.resolveInitiative(player);
      setDone(true);
      return;
    }
    if (step.require === 'passTurn' && player === 'A' && clock.state.activePlayers.length === 1) {
      clock.passTurn();
      setDone(true);
      return
    }
    if (clock.state.activePlayers.includes(player)) {
      clock.passTurn();
      return
    }
  };

  const handleBandTap = () => {
    if (step.require === 'endStrategy') {
      clock.endStrategyPhase();
      setDone(true);
    }
  };

  const handleCycle = (player: PlayerId, i: number) => {
    if (!step.allowCycle) return;
    clock.cycleOperative(player, i);
    if (step.require === 'cycle') setDone(true);
  };

  const handleOpenMenu = (player: PlayerId) => {
    setMenuOpen(player);
    if (step.require === 'openMenu') setDone(true);
  };

  // "Next TP" only actually advances on the step that teaches it; elsewhere it
  // stays a read-only close, like the menu's other game-state actions. Closing
  // the menu also lets the learner see the board jump to the next turning point.
  const handleAdvanceTurn = () => {
    setMenuOpen(null);
    if (step.require === 'advanceTurningPoint') {
      clock.advanceTurningPoint();
      setDone(true);
    }
  };

  return (
    <div className="relative h-full">
      <TutorialClockScene
        clock={clock}
        highlight={step.kind === 'card' ? 'none' : step.highlight}
        annotate={Boolean(step.annotate)}
        allowCycle={Boolean(step.allowCycle)}
        menuOpen={menuOpen}
        onZoneTap={handleZoneTap}
        onBandTap={handleBandTap}
        onCycle={handleCycle}
        onOpenMenu={handleOpenMenu}
        onCloseMenu={() => setMenuOpen(null)}
        onAdvanceTurn={handleAdvanceTurn}
      />
      <TutorialOverlay
        step={step}
        index={index}
        total={STEPS.length}
        done={done}
        onBack={goBack}
        onNext={goNext}
        onExit={onExit}
      />
    </div>
  );
}
