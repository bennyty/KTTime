import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { OperativeState } from '../timer/types';
import App from '../App';
import { countCounteracts } from './scenarios';

beforeEach(() => localStorage.clear());

function heading(name: RegExp | string) {
  return screen.getByRole('heading', { level: 2, name });
}

function clickNext() {
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
}

/** A tap = pointer down then up with no hold, which useLongPress reads as onTap. */
function tapZone(player: 'A' | 'B') {
  const zone = screen.getByRole('button', { name: `Player ${player} zone` });
  fireEvent.pointerDown(zone, { clientX: 0, clientY: 0 });
  fireEvent.pointerUp(zone);
}

describe('countCounteracts', () => {
  // B holds initiative (aligned left); you (A) are offset right, so the
  // unanswered gap sits opposite each of B's ready-pairs at slot index j.
  it('counts each opponent ready-pair whose facing slot you have expended', () => {
    const states: Record<'A' | 'B', OperativeState[]> = {
      A: ['activated', 'activated', 'activated', 'ready', 'ready', 'ready'],
      B: ['ready', 'ready', 'ready', 'ready', 'ready', 'ready'],
    };
    // B pairs (0,1)(1,2)(2,3)(3,4)(4,5); your facing slots 0..4 — 0,1,2 expended.
    expect(countCounteracts(states, 'B', 'A')).toBe(3);
  });

  it('is zero when your ready operatives interleave every opponent pair', () => {
    const states: Record<'A' | 'B', OperativeState[]> = {
      A: Array(6).fill('ready'),
      B: Array(6).fill('ready'),
    };
    expect(countCounteracts(states, 'B', 'A')).toBe(0);
  });
});

describe('tutorial workflow', () => {
  it('is opt-in from the setup screen and never auto-launches', () => {
    render(<App />);
    // The board / tutorial chrome must not be present until the user asks for it.
    expect(screen.queryByRole('heading', { level: 2, name: /chess clock for Kill Team/ })).not.toBeInTheDocument();
    expect(screen.getByText('New here? Take the tutorial')).toBeInTheDocument();
  });

  it('walks the whole workflow and returns to setup on exit', () => {
    render(<App />);
    fireEvent.click(screen.getByText('New here? Take the tutorial'));

    // Welcome card
    heading(/chess clock for Kill Team/);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    // Layout
    heading(/The board/);
    clickNext();

    // Pass: Next is gated until you actually pass the turn.
    heading(/Passing the turn/);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    tapZone('A');
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    clickNext();

    // Menu: gated until you open the controls yourself.
    heading(/The menu/);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Player A menu' }));
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    clickNext();

    // Initiative: tap the winner.
    heading(/Initiative/);
    tapZone('A');
    clickNext();

    // Strategy: end it from the band.
    heading(/Strategy phase/);
    fireEvent.click(screen.getByText('Tap here to end strategy phase'));
    clickNext();

    // Firefight: cycle one of your operatives.
    heading(/Firefight/);
    fireEvent.click(screen.getByLabelText('Player A operative 1: ready'));
    clickNext();

    // Counteracts: the negative-space count badge is shown.
    heading(/Counteracts/);
    expect(screen.getByLabelText(/counteractions available/)).toBeInTheDocument();
    clickNext();

    // Ending the turning point: open the menu, then advance to the next TP.
    heading(/Ending the turning point/);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Player A menu' }));
    fireEvent.click(screen.getByRole('button', { name: /Next TP/ }));
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    clickNext();

    // Done -> Finish returns to setup with the real game untouched.
    heading(/You/);
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(screen.getByText('KTTime')).toBeInTheDocument();
    expect(screen.getByText('Start game')).toBeInTheDocument();
  });

  it('can exit early from the welcome card', () => {
    render(<App />);
    fireEvent.click(screen.getByText('New here? Take the tutorial'));
    heading(/chess clock for Kill Team/);
    fireEvent.click(screen.getByRole('button', { name: 'Exit tutorial' }));
    expect(screen.getByText('Start game')).toBeInTheDocument();
  });
});
