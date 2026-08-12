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

  it('tapping the active player\'s own zone passes the turn to the other player', () => {
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByText('Start game'));

    // Player A is active by default; tapping A's zone should end A's turn.
    fireEvent.click(screen.getByText('Player A'));

    // Re-render is driven by the ticking interval; flush it inside act().
    act(() => {
      vi.advanceTimersByTime(5_250);
    });

    expect(screen.getAllByText('Active').length).toBe(1);
  });

  it('reset from the menu returns to the setup screen', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Start game'));

    fireEvent.click(screen.getByLabelText('Menu'));
    fireEvent.click(screen.getByText('Reset (back to setup)'));

    expect(screen.getByText('KTTime')).toBeInTheDocument();
    expect(screen.getByText('Start game')).toBeInTheDocument();
  });
});
