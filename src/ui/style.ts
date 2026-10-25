// Shared values and helpers for the screens (kept apart from components for fast refresh).
import type { CSSProperties } from 'react';
import { HEAVEN, type Color, type GameState } from '../engine';
import { SHAPES, SLOT_INDEX, getTheme, type Theme } from '../theme/themes';

/** Pre-game screens (home, setup) always use the Roots look. */
export const ROOTS = getTheme('roots');
export const DARK_INK = '#1B1714';
export const GOLD_BUTTON = '#E8B21C';

export const display = (size: number, extra?: CSSProperties): CSSProperties => ({
  fontFamily: "'Caveat Brush', cursive",
  fontSize: size,
  lineHeight: 1,
  ...extra,
});

const SHAPE_PLURAL = { diamond: 'diamond', triangle: 'triangle', circle: 'round', square: 'square' } as const;

/** Everything the screens say about a seat. */
export function seatInfo(theme: Theme, color: Color, game?: GameState) {
  const i = SLOT_INDEX[color];
  const colorName = theme.colorNames[i]!;
  const player = game?.players.find((p) => p.color === color);
  return {
    color,
    name: player?.name ?? colorName,
    yard: theme.yards[i]!,
    colorName,
    shapeWord: SHAPE_PLURAL[SHAPES[color].shape as keyof typeof SHAPE_PLURAL],
    paint: theme.players[color],
    home: game ? game.men[color].filter((p) => p === HEAVEN).length : 0,
  };
}

/** A color bright enough to use as a glow or accent ring on the dark frame. */
export function accentFor(theme: Theme, color: Color): string {
  const hex = theme.players[color].replace('#', '');
  const [r, g, b] = [0, 2, 4].map((o) => parseInt(hex.slice(o, o + 2), 16));
  const luminance = (0.299 * r! + 0.587 * g! + 0.114 * b!) / 255;
  return luminance < 0.25 ? theme.callout : theme.players[color];
}
