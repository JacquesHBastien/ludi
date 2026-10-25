import { describe, expect, it } from 'vitest';
import { COLORS } from '../engine';
import { THEME_IDS, getTheme, heavenColor } from './themes';

describe('themes', () => {
  it.each(THEME_IDS)('%s: the X across heaven never matches a heaven triangle', (id) => {
    const theme = getTheme(id);
    for (const c of COLORS) expect(heavenColor(theme, c).toLowerCase()).not.toBe(theme.saltire.toLowerCase());
  });
});
