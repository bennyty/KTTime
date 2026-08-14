import { SVGProps, useEffect, useState } from 'react';
import type { PlayerId } from '../timer/types';

interface MenuSheetProps {
  isPaused: boolean;
  isShared: boolean;
  turningPoint: number;
  initiativeHolder: PlayerId;
  /** Which player long-pressed to open this menu — B's sheet opens at the top, upside down, to match B's own zone orientation. */
  origin: PlayerId;
  /**
   * One MenuSheet is mounted per player, permanently, sitting off-screen at
   * its own edge; the parent renders both simultaneously and only one is
   * ever `visible` at a time, so opening one implicitly dismisses the other.
   */
  visible: boolean;
  onTogglePause: () => void;
  onToggleShared: () => void;
  onReset: () => void;
  onAdvanceTurningPoint: () => void;
  onToggleInitiative: () => void;
  onClose: () => void;
}

export function MenuSheet({
  isPaused,
  isShared,
  turningPoint,
  initiativeHolder,
  origin,
  visible,
  onTogglePause,
  onToggleShared,
  onReset,
  onAdvanceTurningPoint,
  onToggleInitiative,
  onClose,
}: MenuSheetProps) {
  // Slides in from whichever edge the sheet is anchored to: up from below for
  // A's bottom sheet, down from above for B's top sheet.
  const positionClass = origin === 'B' ? 'top-0 rotate-180 border-b' : 'bottom-0 border-t';
  const offScreenClass = origin === 'B' ? '-translate-y-full' : 'translate-y-full';
  const translateClass = visible ? 'translate-y-0' : offScreenClass;

  // Reset is destructive (wipes the clock and activation state), so it asks
  // for a second confirming tap rather than firing immediately. The pending
  // confirmation is local UI state, not lifted to the parent, and is cleared
  // whenever the sheet closes so it never reopens already armed.
  const [confirmingReset, setConfirmingReset] = useState(false);
  useEffect(() => {
    if (!visible) setConfirmingReset(false);
  }, [visible]);

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 z-20 mx-auto flex max-w-4xl flex-col gap-3 border-neutral-700 bg-neutral-900 p-5 transition-transform duration-300 ease-out ${positionClass} ${translateClass} ${
        visible ? '' : 'pointer-events-none'
      }`}
    >
      {confirmingReset ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <MaterialSymbolsWarningRounded className="h-10 w-10 text-red-500" />
          <p className="text-lg font-semibold text-red-400">Reset the game?</p>
          <p className="text-sm text-neutral-400">
            This clears both clocks, activations, and the turning point. It can&apos;t be undone.
          </p>
          <div className="grid w-full grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setConfirmingReset(false)}
              className="rounded-lg bg-neutral-800 p-3.5 text-lg text-neutral-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmingReset(false);
                onReset();
              }}
              className="rounded-lg bg-red-900 p-3.5 text-lg text-red-50"
            >
              Reset
            </button>
          </div>
        </div>
      ) : (
        <>
          <div>
            <p className="mb-2 text-sm uppercase tracking-wider text-neutral-500">Clock</p>
            <div className="grid grid-cols-3 gap-2.5 text-4xl">
              <button
                type="button"
                onClick={onTogglePause}
                className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg bg-neutral-800 p-2 text-neutral-100"
              >
                {isPaused ?
                  <>
                  <MaterialSymbolsResumeRounded />
                  <span className="text-sm">Resume</span>
                  </>
                :
                  <>
                  <MaterialSymbolsPause />
                  <span className="text-sm">Pause</span>
                  </>
                }
              </button>
              <button
                type="button"
                onClick={onToggleShared}
                className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg bg-neutral-800 p-2 text-neutral-100"
              >
                <AkarIconsLinkChain />
                <span className="text-sm">Shared Time{isShared && <span className="ml-1 opacity-70">✓</span>}</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmingReset(true)}
                className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg bg-neutral-800 p-2 text-neutral-100"
              >
                <FluentArrowReset24Filled />
                <span className="text-sm">Reset</span>
              </button>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm uppercase tracking-wider text-neutral-500">Game state</p>
            <div className="grid grid-cols-3 gap-2.5 text-4xl">
              <button
                type="button"
                onClick={onAdvanceTurningPoint}
                className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg bg-neutral-800 p-2 text-neutral-100"
              >
                <MaterialSymbolsNextPlanOutline />
                <span className="text-sm">Next TP <span className="opacity-70">({turningPoint})</span></span>
              </button>
              <button
                type="button"
                onClick={onToggleInitiative}
                className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg bg-neutral-800 p-2 text-neutral-100"
              >
                <TablerArrowsTransferUpDown />
                <span className="text-sm">Initiative <span className="opacity-70">({initiativeHolder})</span></span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg bg-neutral-800 p-2 text-neutral-100"
              >
                <MaterialSymbolsCloseRounded />
                <span className="text-sm">Close</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


function MaterialSymbolsResumeRounded(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>{/* Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE */}<path fill="currentColor" d="M6 17V7q0-.425.288-.712T7 6t.713.288T8 7v10q0 .425-.288.713T7 18t-.712-.288T6 17m5.525.1q-.5.3-1.012 0T10 16.225v-8.45q0-.575.513-.875t1.012 0l7.05 4.25q.5.3.5.85t-.5.85z" /></svg>
  )
}

function MaterialSymbolsPause(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>{/* Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE */}<path fill="currentColor" d="M14 19V5h4v14zm-8 0V5h4v14z" /></svg>
  )
}

function AkarIconsLinkChain(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>{/* Icon from Akar Icons by Arturo Wibawa - https://github.com/artcoholic/akar-icons/blob/master/LICENSE */}<g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M13.544 10.456a4.37 4.37 0 0 0-6.176 0l-3.089 3.088a4.367 4.367 0 1 0 6.177 6.177L12 18.177" /><path d="M10.456 13.544a4.37 4.37 0 0 0 6.176 0l3.089-3.088a4.367 4.367 0 1 0-6.177-6.177L12 5.823" /></g></svg>
  )
}

function FluentArrowReset24Filled(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>{/* Icon from Fluent UI System Icons by Microsoft Corporation - https://github.com/microsoft/fluentui-system-icons/blob/main/LICENSE */}<path fill="currentColor" d="M7.207 2.543a1 1 0 0 1 0 1.414L5.414 5.75h7.836a8 8 0 1 1-8 8a1 1 0 1 1 2 0a6 6 0 1 0 6-6H5.414l1.793 1.793a1 1 0 0 1-1.414 1.414l-3.5-3.5a1 1 0 0 1 0-1.414l3.5-3.5a1 1 0 0 1 1.414 0" /></svg>
  )
}

function MaterialSymbolsNextPlanOutline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>{/* Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE */}<path fill="currentColor" d="M6 14h2q0-1.475 1.075-2.488T11.65 10.5q.9 0 1.675.413T14.6 12H13v2h5V9h-2v1.55q-.8-.95-1.912-1.5T11.65 8.5q-2.375 0-4.012 1.6T6 14m6 8q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20m0-8" /></svg>
  )
}

function TablerArrowsTransferUpDown(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>{/* Icon from Tabler Icons by Paweł Kuna - https://github.com/tabler/tabler-icons/blob/master/LICENSE */}<path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21v-6m13-9l-3-3l-3 3m-4 12l-3 3l-3-3M7 3v2m0 4v2m10-8v6m0 12v-2m0-4v-2" /></svg>
  )
}

function MaterialSymbolsWarningRounded(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>{/* Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE */}<path fill="currentColor" d="M1 21L12 2l11 19zm3.45-2h15.1L12 6zM12 18q.425 0 .713-.288T13 17t-.288-.712T12 16t-.712.288T11 17t.288.713T12 18m-1-3h2v-5h-2z" /></svg>
  )
}

function MaterialSymbolsCloseRounded(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>{/* Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE */}<path fill="currentColor" d="m12 13.4l-4.9 4.9q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7l4.9-4.9l-4.9-4.9q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l4.9 4.9l4.9-4.9q.275-.275.7-.275t.7.275t.275.7t-.275.7L13.4 12l4.9 4.9q.275.275.275.7t-.275.7t-.7.275t-.7-.275z" /></svg>
  )
}