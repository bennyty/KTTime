import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, startGame } from './engine';
import { clearState, loadState, saveState } from './persistence';

beforeEach(() => {
  localStorage.clear();
});

describe('persistence', () => {
  it('returns null when nothing has been saved', () => {
    expect(loadState()).toBeNull();
  });

  it('round-trips a saved state exactly', () => {
    const state = startGame(createInitialState(), { A: 60_000, B: 60_000 }, 12345);
    saveState(state);
    expect(loadState()).toEqual(state);
  });

  it('ignores a stored value with a mismatched schema version', () => {
    localStorage.setItem('kttime.gameState.v1', JSON.stringify({ schemaVersion: 1 }));
    expect(loadState()).toBeNull();
  });

  it('ignores malformed JSON rather than throwing', () => {
    localStorage.setItem('kttime.gameState.v1', 'not json');
    expect(loadState()).toBeNull();
  });

  it('clearState removes the saved value', () => {
    saveState(startGame(createInitialState(), { A: 1, B: 1 }, 0));
    clearState();
    expect(loadState()).toBeNull();
  });
});
