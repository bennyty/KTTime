import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

// The tappable player zone is a full-bleed <button aria-label="Player X zone">
// sitting under the (pointer-events-none) label/badge, so target it by role
// rather than clicking the "Player X" label text.
const zone = (player: 'A' | 'B') => screen.getByRole('button', { name: `Player ${player} zone` });
// The label, badge, brightness state, etc. live on the zone's outer container,
// which is the nearest <div> ancestor of the "Player X" label span.
const zoneEl = (player: 'A' | 'B') => screen.getByText(`Player ${player}`).closest('div')!;

describe('App', () => {
  it('starts on the setup screen with the default preset selected', () => {
    render(<App />);
    expect(screen.getByText('KTTime')).toBeInTheDocument();
    expect(screen.getByText('2 hours')).toBeInTheDocument();
  });

  it('starting a game shows both player zones counting down from the chosen budget', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1));
    render(<App />);
    fireEvent.click(screen.getByText('Start game'));

    // 2h default, split 50/50 -> each player shows 1:00:00 at the instant play starts
    const readouts = screen.getAllByText('1:00:00');
    expect(readouts).toHaveLength(2);
  });

  it('starts in shared depletion awaiting initiative; tapping a zone declares that player the winner', () => {
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByText('Start game'));

    expect(screen.getAllByText('Shared')).toHaveLength(2);
    expect(screen.getByText('Roll for initiative')).toBeInTheDocument();

    fireEvent.click(zone('A'));

    expect(screen.queryByText('Roll for initiative')).not.toBeInTheDocument();
    expect(screen.getAllByText('Active').length).toBe(1);
    expect(zoneEl('A')).toHaveTextContent('Active');
  });

  it('shows the strategy phase after initiative is resolved; tapping it ends the strategy phase', () => {
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByText('Start game'));

    // Resolve the opening initiative roll to reach the strategy phase.
    fireEvent.click(zone('A'));

    const endStrategy = screen.getByText('Tap here to end strategy phase');
    expect(endStrategy).toBeInTheDocument();

    fireEvent.click(endStrategy);

    // Firefight phase: the strategy prompt is gone and the operative grid shows.
    expect(screen.queryByText('Tap here to end strategy phase')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Player A operative 1: ready')).toBeInTheDocument();
  });

  it('passing the turn during the firefight phase auto-activates the passing player\'s left-most ready operative', () => {
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByText('Start game'));

    fireEvent.click(zone('A')); // A wins initiative
    fireEvent.click(screen.getByText('Tap here to end strategy phase')); // enter firefight

    fireEvent.click(zone('A')); // A passes the turn to B

    expect(screen.getByLabelText('Player A operative 1: activated')).toBeInTheDocument();
  });

  it("tapping the active player's own zone passes the turn to the other player", () => {
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByText('Start game'));

    // Resolve the opening initiative roll so A is the sole active player.
    fireEvent.click(zone('A'));

    fireEvent.click(zone('A'));

    // Re-render is driven by the ticking interval; flush it inside act().
    act(() => {
      vi.advanceTimersByTime(5_250);
    });

    expect(screen.getAllByText('Active').length).toBe(1);
    expect(zoneEl('B')).toHaveTextContent('Active');
  });

  it('long-pressing a player zone opens the menu on release; reset from it returns to the setup screen', () => {
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByText('Start game'));

    fireEvent.pointerDown(zone('A'), { clientX: 0, clientY: 0 });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    // The menu doesn't open until release — it must not exist while the
    // finger is still down, so a menu button can never end up underneath it.
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
    fireEvent.pointerUp(zone('A'));

    // Both players have a permanently-mounted (but off-screen when inactive)
    // menu with identical button text, so target the accessible one — RTL's
    // getByRole excludes aria-hidden subtrees by default. Reset asks for a
    // confirming second tap before it fires.
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByText('KTTime')).toBeInTheDocument();
    expect(screen.getByText('Start game')).toBeInTheDocument();
  });

  it('dims the zone once held past the long-press threshold, as feedback during the hold', () => {
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByText('Start game'));

    const zoneA = zoneEl('A');
    fireEvent.pointerDown(zone('A'), { clientX: 0, clientY: 0 });
    expect(zoneA).not.toHaveClass('brightness-75');

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(zoneA).toHaveClass('brightness-75');

    fireEvent.pointerUp(zone('A'));
    expect(zoneA).not.toHaveClass('brightness-75');
  });

  it("a short tap on a player zone doesn't open the menu", () => {
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByText('Start game'));

    fireEvent.pointerDown(zone('A'), { clientX: 0, clientY: 0 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.pointerUp(zone('A'));
    fireEvent.click(zone('A'));

    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
  });

  it("opening B's menu dismisses A's", () => {
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByText('Start game'));

    fireEvent.pointerDown(zone('A'), { clientX: 0, clientY: 0 });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    fireEvent.pointerUp(zone('A'));
    expect(screen.getAllByRole('button', { name: 'Reset' })).toHaveLength(1);

    fireEvent.pointerDown(zone('B'), { clientX: 0, clientY: 0 });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    fireEvent.pointerUp(zone('B'));
    // Still exactly one accessible Reset button — B's menu replaced A's, not joined it.
    expect(screen.getAllByRole('button', { name: 'Reset' })).toHaveLength(1);
  });

  it('advancing the turning point covers the grid with an initiative prompt; tapping a zone resolves it', () => {
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByText('Start game'));

    // Resolve the opening initiative roll first, so this exercises advancing
    // a *later* turning point rather than the still-unresolved opening one.
    fireEvent.click(zone('A'));

    // Open the menu and advance the turning point.
    fireEvent.pointerDown(zone('A'), { clientX: 0, clientY: 0 });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    fireEvent.pointerUp(zone('A'));
    fireEvent.click(screen.getByRole('button', { name: /Next TP/ }));

    // Both zones read "Shared" and the grid is covered by the prompt.
    expect(screen.getAllByText('Shared')).toHaveLength(2);
    expect(screen.getByText('Roll for initiative')).toBeInTheDocument();

    // Tapping B's zone declares B the winner: prompt clears, B alone is active.
    fireEvent.click(zone('B'));

    expect(screen.queryByText('Roll for initiative')).not.toBeInTheDocument();
    expect(screen.getAllByText('Active')).toHaveLength(1);
    expect(zoneEl('B')).toHaveTextContent('Active');
  });
});
