import { useState } from 'react';
import { ClockScreen } from './components/ClockScreen';
import { SetupScreen } from './components/SetupScreen';
import { useGameClock } from './hooks/useGameClock';
import { TutorialScreen } from './tutorial/TutorialScreen';

export default function App() {
  const clock = useGameClock();
  // Opt-in tutorial, reachable only from the setup screen. It runs on its own
  // isolated clock and does not touch the real game state below.
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <div className="mx-auto h-full max-w-4xl">
      {showTutorial ? (
        <TutorialScreen onExit={() => setShowTutorial(false)} />
      ) : clock.state.phase === 'setup' ? (
        <SetupScreen
          onStart={(budgets, operativeCounts, autoActivateOnPass) =>
            clock.startGame(budgets, operativeCounts, autoActivateOnPass)
          }
          onOpenTutorial={() => setShowTutorial(true)}
        />
      ) : (
        <ClockScreen clock={clock} />
      )}
    </div>
  );
}
