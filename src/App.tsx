import { ClockScreen } from './components/ClockScreen';
import { SetupScreen } from './components/SetupScreen';
import { useGameClock } from './hooks/useGameClock';

export default function App() {
  const clock = useGameClock();

  if (clock.state.phase === 'setup') {
    return <SetupScreen onStart={(budgets) => clock.startGame(budgets)} />;
  }

  return <ClockScreen clock={clock} />;
}
