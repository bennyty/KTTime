import { ClockScreen } from './components/ClockScreen';
import { SetupScreen } from './components/SetupScreen';
import { useGameClock } from './hooks/useGameClock';

export default function App() {
  const clock = useGameClock();

  return (
    <div className="mx-auto h-full max-w-4xl">
      {clock.state.phase === 'setup' ? (
        <SetupScreen
          onStart={(budgets, operativeCounts, autoActivateOnPass) =>
            clock.startGame(budgets, operativeCounts, autoActivateOnPass)
          }
        />
      ) : (
        <ClockScreen clock={clock} />
      )}
    </div>
  );
}
