import type { PersistedGameState } from '../timer/types';
import {
  sceneBackdrop,
  sceneCounteract,
  sceneFirefight,
  sceneFirefight2,
  sceneInitiative,
  sceneMenu,
  sceneNextTurn,
  scenePass,
  sceneStrategy,
} from './scenarios';

/** What the learner must do before "Next" unlocks. `none` = read-only step. */
export type Interaction =
  | 'none'
  | 'passTurn'
  | 'tapWinner'
  | 'endStrategy'
  | 'openMenu'
  | 'cycle'
  | 'advanceTurningPoint';

/** Which region gets the pulsing highlight ring. */
export type Highlight = 'none' | 'zoneA' | 'zoneB' | 'band' | 'both';

export interface TutorialStep {
  id: string;
  /** Absolute clock state entered at the start of this step (also on Back). */
  scenario: () => PersistedGameState;
  /** `card` renders a centered modal over a dimmed board; `board` teaches on the live board. */
  kind: 'card' | 'board';
  title: string;
  /** Short supporting lines. Keep them to a phrase each — the board does the teaching. */
  lines: string[];
  /** A one-line "where/why you'd use this" aside, shown muted. */
  why?: string;
  highlight: Highlight;
  /** Caption placement, kept clear of the highlighted region. */
  anchor: 'top' | 'bottom' | 'center';
  /** Lights the matching pill in the phase rail. */
  phase?: 'initiative' | 'strategy' | 'firefight';
  /** Action that unlocks Next (and the prompt shown until it's done). */
  require?: Interaction;
  prompt?: string;
  /** Confirmation shown once `require` is satisfied. */
  doneHint?: string;
  /** Free-form circle cycling allowed (tracker + counteract exploration). */
  allowCycle?: boolean;
  /** Draw the counteract negative-space annotations over the grid. */
  annotate?: boolean;
}

export const STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    scenario: sceneBackdrop,
    kind: 'card',
    title: 'A chess clock for Kill Team',
    lines: ['One clock for each player. Your time counts down on your turn.', 'Let\'s play one turning point together.'],
    why: '',
    highlight: 'none',
    anchor: 'center',
  },
  {
    id: 'layout',
    scenario: sceneBackdrop,
    kind: 'board',
    title: 'The board',
    lines: ['Top zone is your opponent\'s (upside-down since they sit across from you)', 'Bottom zone is your timer.', 'The band in the middle is for notifications and the activation tracker.'],
    highlight: 'both',
    anchor: 'top',
  },
  {
    id: 'pass',
    scenario: scenePass,
    kind: 'board',
    title: 'Passing the turn',
    lines: ['Your clock is running (green).', 'Tap your own zone to end your turn — that starts your opponent\'s clock.'],
    why: 'This is the loop. Do your activation, tap to pass when you\'re done.',
    highlight: 'zoneA',
    anchor: 'top',
    require: 'passTurn',
    prompt: 'Tap your zone (Player A) to pass',
    doneHint: 'Done — B\'s clock is now running.',
  },
  {
    id: 'menu',
    scenario: sceneMenu,
    kind: 'board',
    title: 'The menu',
    lines: ['Long-press your zone (or tap ☰) to open the controls.', 'From there you can Pause, activate Shared Time, move to the next Turning Point, or Reset the game.'],
    why: '',
    highlight: 'none',
    anchor: 'top',
    require: 'openMenu',
    prompt: 'Long-press your zone (or tap ☰) to open the menu',
    doneHint: 'That\'s the menu. Close it and tap Next.',
  },
  {
    id: 'nextTurn',
    scenario: sceneNextTurn,
    kind: 'board',
    title: 'Ending the turning point',
    lines: ['We\'ve skipped ahead. Every operative has activated — this turning point is done.', 'Open the menu and tap "Next TP" to advance.'],
    why: 'End the turning point in the app once activations are finished, but before you score the turning point. This will automatically put the timer in Shared Time since neither player is active during scoring.',
    highlight: 'none',
    anchor: 'top',
    phase: 'firefight',
    require: 'advanceTurningPoint',
    prompt: 'Open the menu and tap "Next TP"',
    doneHint: 'Turning point 2 — back to the initiative roll.',
  },
  {
    id: 'initiative',
    scenario: sceneInitiative,
    kind: 'board',
    title: 'Initiative Phase',
    lines: ['Every turning point starts here.', 'Roll-off for initiative, then tap whoever has initiative.'],
    why: 'You are in Shared Time: both clocks run at half speed when in shared time. Shared time is for anything where you are both using time (e.g. initiative or calling a TO).',
    highlight: 'both',
    anchor: 'top',
    phase: 'initiative',
    require: 'tapWinner',
    prompt: 'Tap Player A (we\'ll say you got the initiative)',
    doneHint: 'You have initiative — your clock starts counting and we move to the strategy phase.',
  },
  {
    id: 'strategy',
    scenario: sceneStrategy,
    kind: 'board',
    title: 'Strategy phase',
    lines: ['Here is where you\'d use a strategic ploy and pass time to your opponent.', 'When you are done and both pass, tap the center band to go to the firefight phase.'],
    why: '',
    highlight: 'band',
    anchor: 'top',
    phase: 'strategy',
    require: 'endStrategy',
    prompt: 'Tap the band to end the strategy phase',
    doneHint: 'Into the firefight phase!',
  },
  {
    id: 'firefight',
    scenario: sceneFirefight,
    kind: 'board',
    title: 'Firefight Phase',
    lines: ['The activation tracker shows your operatives on the bottom and your opponent\'s on top.', 'Bright = Ready', 'Dark = Expended', '☠ = Incapacitated'],
    why: 'Tap a circle to cycle Ready → Expended → Incapacitated → Ready.',
    highlight: 'band',
    anchor: 'top',
    phase: 'firefight',
    require: 'cycle',
    prompt: 'Tap directly on one of your circles to Expend it.',
    doneHint: 'That operative is now Expended. Try tapping again to mark it Incapacitated.',
    allowCycle: true,
  },
  {
    id: 'firefight2',
    scenario: sceneFirefight2,
    kind: 'board',
    title: 'Automatically activate operatives',
    lines: ['Manually tapping the circles is tedious. In *most* cases, you do not have to!', 'By default, the app will automatically expend the next operative in line when you pass the turn.', 'If you use an ability such as Group Activation, you should manually mark an operative at the *end* of the tracker as expended.'],
    why: 'This allows you to visually track how many activations remain.',
    highlight: 'band',
    anchor: 'top',
    phase: 'firefight',
    require: 'passTurn',
    prompt: 'Pass your turn now to automatically expend your 3rd operative.',
    doneHint: 'That operative is automatically Expended and you\'ve passed to your opponent. Easy!',
  },
  {
    id: 'counteract',
    scenario: sceneCounteract,
    kind: 'board',
    title: 'Counteracts',
    lines: ['The farthest right circle is the first operative to activate.', 'You can visually see when you will receive a counteraction by looking for an empty slot between two of your opponent\'s Ready operatives.'],
    why: 'The tracker is a guide, rules such as Group Activation can change the amount of counteractions you actually receive.',
    highlight: 'band',
    anchor: 'bottom',
    phase: 'firefight',
    allowCycle: true,
    require: 'cycle',
    prompt: 'Experiment with marking one of your opponent\'s ending operatives as Incapacitated to see how it changes the counteract slots.',
    annotate: true,
  },
  {
    id: 'counteract2',
    scenario: sceneCounteract,
    kind: 'board',
    title: 'Tracking activations',
    lines: ['Mark Expended operatives on the leading edge for "normal" activations', 'Mark Expended operatives on the trailing edge if they activate out of the normal sequence.', 'If a Ready operative is Incapacitated before it activates, mark the farthest back Ready operative as Incapactiated.'],
    why: 'Try experimenting with different states to understand why you should manually mark operatives at the *end* as Incapacitated.',
    highlight: 'band',
    anchor: 'bottom',
    phase: 'firefight',
    allowCycle: true,
    annotate: true,
  },
  {
    id: 'done',
    scenario: sceneBackdrop,
    kind: 'card',
    title: 'You\'re ready',
    lines: ['Roll for initiative → strategy → firefight, every turning point.', 'Tap your zone to hand over. Watch the gaps for counteractions.'],
    why: 'Exit to set your time and operatives, then start a real game.',
    highlight: 'none',
    anchor: 'center',
  },
];
