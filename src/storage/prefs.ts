import { DEFAULT_RULES, type Color, type Rules } from '../engine';
import { DEFAULT_THEME, THEME_IDS, type ThemeId } from '../theme/themes';

export const PREFS_KEY = 'ludi.prefs.v1';

export interface Prefs {
  patois: boolean;
  /** Board for the current (or last) game. */
  themeId: ThemeId;
  rules: Rules;
  /** Names typed in setup, remembered for next time. */
  names: Partial<Record<Color, string>>;
  /** Colors picked in setup last time. */
  colors: Color[];
}

export const DEFAULT_PREFS: Prefs = {
  patois: true,
  themeId: DEFAULT_THEME,
  rules: DEFAULT_RULES,
  names: {},
  colors: ['red', 'gold', 'green', 'black'],
};

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const saved = JSON.parse(raw) as Partial<Prefs>;
    const prefs = { ...DEFAULT_PREFS, ...saved, rules: { ...DEFAULT_RULES, ...saved.rules } };
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
