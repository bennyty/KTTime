import { useState } from 'react';
import { DEFAULT_PRESET, TIME_CONTROL_PRESETS } from '../timer/presets';

const MINUTE_MS = 60_000;
const MIN_OPERATIVES = 5;
const MAX_OPERATIVES = 14;
const DEFAULT_OPERATIVES = 9;

interface SetupScreenProps {
  onStart: (
    budgets: { A: number; B: number },
    operativeCounts: { A: number; B: number },
    autoActivateOnPass: boolean,
  ) => void;
}

function validOperativeCount(n: number) {
  return Number.isInteger(n) && n >= MIN_OPERATIVES && n <= MAX_OPERATIVES;
}

export function SetupScreen({ onStart }: SetupScreenProps) {
  const [totalMinutes, setTotalMinutes] = useState(DEFAULT_PRESET.totalMs / MINUTE_MS);
  const [customMinutes, setCustomMinutes] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [asymmetric, setAsymmetric] = useState(false);
  const [minutesA, setMinutesA] = useState(totalMinutes / 2);
  const [minutesB, setMinutesB] = useState(totalMinutes / 2);
  const [operativesA, setOperativesA] = useState(DEFAULT_OPERATIVES);
  const [operativesB, setOperativesB] = useState(DEFAULT_OPERATIVES);
  const [autoActivateOnPass, setAutoActivateOnPass] = useState(true);

  const applyTotal = (minutes: number) => {
    setTotalMinutes(minutes);
    setMinutesA(minutes / 2);
    setMinutesB(minutes / 2);
  };

  const handleStart = () => {
    const budgets = asymmetric
      ? { A: minutesA * MINUTE_MS, B: minutesB * MINUTE_MS }
      : { A: (totalMinutes / 2) * MINUTE_MS, B: (totalMinutes / 2) * MINUTE_MS };
    onStart(budgets, { A: operativesA, B: operativesB }, autoActivateOnPass);
  };

  const canStart =
    (asymmetric ? minutesA > 0 && minutesB > 0 : totalMinutes > 0) &&
    validOperativeCount(operativesA) &&
    validOperativeCount(operativesB);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-black px-6 text-neutral-100">
      <h1 className="text-3xl font-bold">KTTime</h1>

      <div className="w-full max-w-xs">
        <p className="mb-2 text-base uppercase tracking-wide text-neutral-400">Total game time</p>
        <div className="grid grid-cols-2 gap-2">
          {TIME_CONTROL_PRESETS.map((preset) => {
            const minutes = preset.totalMs / MINUTE_MS;
            const selected = !isCustom && totalMinutes === minutes;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setIsCustom(false);
                  applyTotal(minutes);
                }}
                className={`rounded-lg p-3 text-base ${selected ? 'bg-green-700' : 'bg-neutral-800'}`}
              >
                {preset.label}
                {preset === DEFAULT_PRESET && <span className="block text-sm opacity-60">default</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-base uppercase tracking-wide text-neutral-400" htmlFor="custom-minutes">
            Custom (minutes)
          </label>
          <input
            id="custom-minutes"
            type="number"
            min={1}
            inputMode="numeric"
            value={customMinutes}
            onChange={(e) => {
              setCustomMinutes(e.target.value);
              setIsCustom(true);
              const parsed = Number(e.target.value);
              if (parsed > 0) applyTotal(parsed);
            }}
            className="w-full rounded-lg bg-neutral-800 p-3 text-base text-neutral-100"
            placeholder="e.g. 150"
          />
        </div>

        <label className="mt-4 flex items-center gap-2 text-base text-neutral-300">
          <input
            type="checkbox"
            checked={asymmetric}
            onChange={(e) => setAsymmetric(e.target.checked)}
            className="h-4 w-4"
          />
          Uneven split between players
        </label>

        {asymmetric && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-sm text-neutral-400" htmlFor="minutes-a">
                Player A (min)
              </label>
              <input
                id="minutes-a"
                type="number"
                min={1}
                inputMode="numeric"
                value={minutesA}
                onChange={(e) => setMinutesA(Number(e.target.value))}
                className="w-full rounded-lg bg-neutral-800 p-3 text-base text-neutral-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-400" htmlFor="minutes-b">
                Player B (min)
              </label>
              <input
                id="minutes-b"
                type="number"
                min={1}
                inputMode="numeric"
                value={minutesB}
                onChange={(e) => setMinutesB(Number(e.target.value))}
                className="w-full rounded-lg bg-neutral-800 p-3 text-base text-neutral-100"
              />
            </div>
          </div>
        )}
      </div>

      <div className="w-full max-w-xs">
        <p className="mb-2 text-base uppercase tracking-wide text-neutral-400">Operatives per player</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-sm text-neutral-400" htmlFor="operatives-a">
              Player A
            </label>
            <input
              id="operatives-a"
              type="number"
              min={MIN_OPERATIVES}
              max={MAX_OPERATIVES}
              inputMode="numeric"
              value={operativesA}
              onChange={(e) => setOperativesA(Number(e.target.value))}
              className="w-full rounded-lg bg-neutral-800 p-3 text-base text-neutral-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-400" htmlFor="operatives-b">
              Player B
            </label>
            <input
              id="operatives-b"
              type="number"
              min={MIN_OPERATIVES}
              max={MAX_OPERATIVES}
              inputMode="numeric"
              value={operativesB}
              onChange={(e) => setOperativesB(Number(e.target.value))}
              className="w-full rounded-lg bg-neutral-800 p-3 text-base text-neutral-100"
            />
          </div>
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          {MIN_OPERATIVES}-{MAX_OPERATIVES} each
        </p>

        <label className="mt-3 flex items-center gap-2 text-base text-neutral-300">
          <input
            type="checkbox"
            checked={autoActivateOnPass}
            onChange={(e) => setAutoActivateOnPass(e.target.checked)}
            className="h-4 w-4"
          />
          Automatically activate operatives
        </label>
        <p className="mt-1 text-sm text-neutral-500">
          When passing the turn, auto-marks your left-most ready operative as activated if you already activated at
          least one this turning point.
        </p>
      </div>

      <button
        type="button"
        onClick={handleStart}
        disabled={!canStart}
        className="w-full max-w-xs rounded-lg bg-green-700 p-4 text-xl font-semibold text-white disabled:opacity-40"
      >
        Start game
      </button>
    </div>
  );
}
