import { afterEach, describe, expect, it } from 'vitest';
import { PREFS_KEY, loadPrefs, savePrefs } from './prefs';

const data = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => data.get(k) ?? null,
  setItem: (k: string, v: string) => void data.set(k, v),
  removeItem: (k: string) => void data.delete(k),
} as Storage;

describe('prefs', () => {
  afterEach(() => data.clear());

  it('new phones start with Heaven-less, Patois and Competitive on', () => {
    const p = loadPrefs();
    expect(p.rules.heavenless).toBe(true);
    expect(p.patois).toBe(true);
    expect(p.competitive).toBe(true);
  });

  it('switches Heaven-less on once for phones saved before it was the default, then respects the choice', () => {
    data.set(PREFS_KEY, JSON.stringify({ patois: false, rules: { diceMode: 'one', heavenless: false } }));
    const p = loadPrefs();
    expect(p.rules).toEqual({ diceMode: 'one', heavenless: true });
    expect(p.patois).toBe(false);

    savePrefs({ ...p, rules: { ...p.rules, heavenless: false } });
    expect(loadPrefs().rules.heavenless).toBe(false);
  });
});
