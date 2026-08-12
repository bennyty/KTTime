import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

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

    fireEvent.click(screen.getByText('Player A'));

    expect(screen.queryByText('Roll for initiative')).not.toBeInTheDocument();
    expect(screen.getAllByText('Active').length).toBe(1);
    expect(screen.getByText('Player A').closest('button')).toHaveTextContent('Active');
  });

  it("tapping the active player's own zone passes the turn to the other player", () => {
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByText('Start game'));

    // Resolve the opening initiative roll so A is the sole active player.
    fireEvent.click(screen.getByText('Player A'));

    fireEvent.click(screen.getByText('Player A'));

    // Re-render is driven by the ticking interval; flush it inside act().
    act(() => {
      vi.advanceTimersByTime(5_250);
    });

    expect(screen.getAllByText('Active').length).toBe(1);
    expect(screen.getByText('Player B').closest('button')).toHaveTextContent('Active');
  });

  it('long-pressing a player zone opens the menu on release; reset from it returns to the setup screen', () => {
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByText('Start game'));

    fireEvent.pointerDown(screen.getByText('Player A'), { clientX: 0, clientY: 0 });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    // The menu doesn't open until release — it must not exist while the
    // finger is still down, so a menu button can never end up underneath it.
    expect(screen.queryByRole('button', { name: /Reset \(back to setup\)/ })).not.toBeInTheDocument();
    fireEvent.pointerUp(screen.getByText('Player A'));

    // Both players have a permanently-mounted (but off-screen when inactive)
    // menu with identical button text, so target the accessible one — RTL's
    // getByRole excludes aria-hidden subtrees by default.
    fireEvent.click(screen.getByRole('button', { name: /Reset \(back to setup\)/ }));

    expect(screen.getByText('KTTime')).toBeInTheDocument();
    expect(screen.getByText('Start game')).toBeInTheDocument();
  });

  it('dims the zone once held past the long-press threshold, as feedback during the hold', () => {
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByText('Start game'));

    const zoneA = screen.getByText('Player A').closest('button');
    fireEvent.pointerDown(screen.getByText('Player A'), { clientX: 0, clientY: 0 });
    expect(zoneA).not.toHaveClass('brightness-75');

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(zoneA).toHaveClass('brightness-75');

    fireEvent.pointerUp(screen.getByText('Player A'));
    expect(zoneA).not.toHaveClass('brightness-75');
  });

  it("a short tap on a player zone doesn't open the menu", () => {
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByText('Start game'));

    fireEvent.pointerDown(screen.getByText('Player A'), { clientX: 0, clientY: 0 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.pointerUp(screen.getByText('Player A'));
    fireEvent.click(screen.getByText('Player A'));

    expect(screen.queryByRole('button', { name: /Reset \(back to setup\)/ })).not.toBeInTheDocument();
  });

  it("opening B's menu dismisses A's", () => {
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByText('Start game'));

    fireEvent.pointerDown(screen.getByText('Player A'), { clientX: 0, clientY: 0 });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    fireEvent.pointerUp(screen.getByText('Player A'));
    expect(screen.getAllByRole('button', { name: /Reset \(back to setup\)/ })).toHaveLength(1);

    fireEvent.pointerDown(screen.getByText('Player B'), { clientX: 0, clientY: 0 });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    fireEvent.pointerUp(screen.getByText('Player B'));
    // Still exactly one accessible Reset button — B's menu replaced A's, not joined it.
    expect(screen.getAllByRole('button', { name: /Reset \(back to setup\)/ })).toHaveLength(1);
  });

  it('advancing the turning point covers the grid with an initiative prompt; tapping a zone resolves it', () => {
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByText('Start game'));

    // Resolve the opening initiative roll first, so this exercises advancing
    // a *later* turning point rather than the still-unresolved opening one.
    fireEvent.click(screen.getByText('Player A'));

    // Open the menu and advance the turning point.
    fireEvent.pointerDown(screen.getByText('Player A'), { clientX: 0, clientY: 0 });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    fireEvent.pointerUp(screen.getByText('Player A'));
    fireEvent.click(screen.getByRole('button', { name: /Next turning point/ }));

    // Both zones read "Shared" and the grid is covered by the prompt.
    expect(screen.getAllByText('Shared')).toHaveLength(2);
    expect(screen.getByText('Roll for initiative')).toBeInTheDocument();

    // Tapping B's zone declares B the winner: prompt clears, B alone is active.
    fireEvent.click(screen.getByText('Player B'));

    expect(screen.queryByText('Roll for initiative')).not.toBeInTheDocument();
    expect(screen.getAllByText('Active')).toHaveLength(1);
    expect(screen.getByText('Player B').closest('button')).toHaveTextContent('Active');
  });
});
