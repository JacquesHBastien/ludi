import data from '../../design/themes.json';
import type { Color } from '../engine';

export type ThemeId = keyof typeof data.themes;
export type Theme = (typeof data.themes)[ThemeId] & { id: ThemeId };

export const THEME_IDS = Object.keys(data.themes) as ThemeId[];
export const DEFAULT_THEME: ThemeId = 'roots';

export function getTheme(id: ThemeId): Theme {
  return { ...data.themes[id], id };
}

/** Index of a color slot in a theme's colorNames / yards lists. */
export const SLOT_INDEX: Record<Color, number> = { red: 0, gold: 1, green: 2, black: 3 };

export const SHAPES = data.playerSlots;

/** Bottle-cap details that stay the same on every board (from the mockups). */
export const CAP: Record<Color, { edge: string; markFill: string; labelInk: string }> = {
  red: { edge: '#1B1714', markFill: '#F4E9D4', labelInk: '#F4E9D4' },
  gold: { edge: '#1B1714', markFill: '#1B1714', labelInk: '#1B1714' },
  green: { edge: '#1B1714', markFill: '#F4E9D4', labelInk: '#F4E9D4' },
  black: { edge: '#E8D9B8', markFill: '#E8B21C', labelInk: '#F4E9D4' },
};

/** The gold used for legal-move glows and block badges. */
export const HIGHLIGHT = '#F2C14E';

export const GRAIN = {
  dark:
    'repeating-linear-gradient(92deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 5px, rgba(255,255,255,0.02) 5px, rgba(255,255,255,0.02) 11px), repeating-linear-gradient(88deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 37px)',
  board:
    'repeating-linear-gradient(91deg, rgba(90,60,30,0.10) 0px, rgba(90,60,30,0.10) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 6px), repeating-linear-gradient(89deg, rgba(60,40,20,0.12) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 23px)',
};

/** Paint for a color's heaven triangle. A theme can override it so the X across heaven always stands out. */
export function heavenColor(theme: Theme, c: Color): string {
  const override = 'heavenTriangles' in theme ? (theme.heavenTriangles as Partial<Record<Color, string>>)[c] : undefined;
  return override ?? theme.players[c];
}
