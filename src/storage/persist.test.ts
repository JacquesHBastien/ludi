import { describe, expect, it } from 'vitest';
import { applyAction, legalMoves } from '../engine';
import type { Action, GameState } from '../engine';
import { roll, scenario } from '../engine/testkit';
import { SAVE_KEY, clearGame, loadGame, saveGame } from './persist';

function memoryStore() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

describe('Persistence', () => {
  it('32. save after an action, reload, the state is identical', () => {
    const store = memoryStore();
    let s: GameState = scenario({ rules: { diceMode: 'two' }, men: { red: [10, 10], gold: [5] } });
    const actions: Action[] = [
      { type: 'roll', dice: [4, 4] },
      { type: 'move', move: { kind: 'pair', from: 10, die: 4 } },
      { type: 'roll', dice: [6, 2] },
    ];
    for (const a of actions) {
      s = applyAction(s, a);
      saveGame(s, store);
      const loaded = loadGame(store);
      expect(loaded).toEqual(s);
      expect(legalMoves(loaded!)).toEqual(legalMoves(s));
    }
    // Play continues the same from the reloaded copy.
    const reloaded = loadGame(store)!;
    const m = legalMoves(s)[0]!;
    expect(applyAction(reloaded, { type: 'move', move: m })).toEqual(applyAction(s, { type: 'move', move: m }));
  });

  it('returns null for missing, corrupt or unknown saves, and can clear', () => {
    const store = memoryStore();
    expect(loadGame(store)).toBeNull();
    store.setItem(SAVE_KEY, '{not json');
    expect(loadGame(store)).toBeNull();
    store.setItem(SAVE_KEY, JSON.stringify({ version: 99 }));
    expect(loadGame(store)).toBeNull();
    store.setItem(SAVE_KEY, JSON.stringify({ version: 1 })); // saved before the start squares moved
    expect(loadGame(store)).toBeNull();
    saveGame(roll(scenario({ rules: { diceMode: 'one' }, men: { red: [1] } }), 6), store);
    expect(loadGame(store)?.turn.phase).toBe('move');
    clearGame(store);
    expect(store.data.has(SAVE_KEY)).toBe(false);
  });
});
