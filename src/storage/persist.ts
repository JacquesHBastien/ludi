import type { GameState } from '../engine';

export const SAVE_KEY = 'ludi.passAndPlay.v1';

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function browserStorage(): KeyValueStore | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // private mode or blocked storage
  }
}

export function saveGame(state: GameState, store: KeyValueStore | null = browserStorage()): void {
  try {
    store?.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the game keeps going, it just won't survive a refresh.
  }
}

export function loadGame(store: KeyValueStore | null = browserStorage()): GameState | null {
  try {
    const raw = store?.getItem(SAVE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as GameState;
    // Older saves count squares differently; drop them rather than misplace men.
    return state.version === 2 ? state : null;
  } catch {
    return null;
  }
}

export function clearGame(store: KeyValueStore | null = browserStorage()): void {
  try {
    store?.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
