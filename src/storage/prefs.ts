import { DEFAULT_RULES, type Color, type Rules } from '../engine';
import { DEFAULT_THEME, THEME_IDS, type ThemeId } from '../theme/themes';

export const PREFS_KEY = 'ludi.prefs.v1';

export interface Prefs {
  /** Bumped when a default changes for everyone (2: Heaven-less on by default). */
  version?: number;
  patois: boolean;
  /** Kill tally, taunts, bounties, rivalry lines and awards. */
  competitive: boolean;
  muted: boolean;
  /** Keep the board zoomed in on the current player's men for the whole turn. */
  closeUp: boolean;
  /** Board for the current (or last) game. */
  themeId: ThemeId;
  rules: Rules;
  /** Names typed in setup, remembered for next time. */
  names: Partial<Record<Color, string>>;
}

const PREFS_VERSION = 2;

export const DEFAULT_PREFS: Prefs = {
  version: PREFS_VERSION,
  patois: true,
  competitive: true,
  muted: false,
  closeUp: false,
  themeId: DEFAULT_THEME,
  // Heaven-less starts switched on in setup; the engine's own default stays off.
  rules: { ...DEFAULT_RULES, heavenless: true },
  names: {},
};

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const saved = JSON.parse(raw) as Partial<Prefs>;
    const rules = { ...DEFAULT_PREFS.rules, ...saved.rules };
    // Phones that saved prefs before Heaven-less became the default get it switched on once.
    if ((saved.version ?? 1) < 2) rules.heavenless = true;
    const prefs = { ...DEFAULT_PREFS, ...saved, rules, version: PREFS_VERSION };
    return THEME_IDS.includes(prefs.themeId) ? prefs : { ...prefs, themeId: DEFAULT_THEME };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore: prefs are a convenience
  }
}
