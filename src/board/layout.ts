// Pixel layout for the board, computed from design/board-geometry.json.
// One grid unit is 21px, so the 16-unit board is 336px: the size in the mockups.
// The SVG scales from there, so these numbers are only the drawing's coordinate space.
import geometry from '../../design/board-geometry.json';
import { HEAVEN, LANE_START, LAST_TRACK, TRACK_LENGTH, YARD, type Color, type Progress } from '../engine';

export const UNIT = 21;
export const BOARD_PX = geometry.gridSize * UNIT;

export type GridRect = readonly [number, number, number, number];
export interface PxRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Point {
  x: number;
  y: number;
}

/** A grid rect in pixels, inset 1px each side so the dark board shows through as lines. */
export function cellRect([x, y, w, h]: GridRect): PxRect {
  return { x: x * UNIT + 1, y: y * UNIT + 1, w: w * UNIT - 2, h: h * UNIT - 2 };
}

export function centerOf([x, y, w, h]: GridRect): Point {
  return { x: (x + w / 2) * UNIT, y: (y + h / 2) * UNIT };
}

const player = (c: Color) => geometry.players[c];

export const trackRects = geometry.track.map((t) => t.rect as unknown as GridRect);
export const laneRects = (c: Color) => player(c).homeLane as unknown as GridRect[];
export const yardRect = (c: Color) => player(c).yard as unknown as GridRect;
export const heavenRect = geometry.heaven as unknown as GridRect;

/** Yards along the top edge put their label at the top; bottom yards put it at the bottom. */
export const isTopYard = (c: Color) => yardRect(c)[1] === 0;

const SOCKETS_TOP = [
  [1.55, 2.15],
  [3.45, 2.15],
  [1.55, 3.85],
  [3.45, 3.85],
] as const;
const SOCKETS_BOTTOM = [
  [1.55, 1.15],
  [3.45, 1.15],
  [1.55, 2.85],
  [3.45, 2.85],
] as const;

/** The n-th (0..3) socket in a color's yard. */
export function yardSpot(c: Color, n: number): Point {
  const [x, y] = yardRect(c);
  const [dx, dy] = (isTopYard(c) ? SOCKETS_TOP : SOCKETS_BOTTOM)[n]!;
  return { x: (x + dx) * UNIT, y: (y + dy) * UNIT };
}

/** Men in heaven sit in a row inside their color's triangle, near its outer edge. */
const HEAVEN_ROW: Record<string, { at: Point; along: Point }> = {
  left: { at: { x: 6.7, y: 8 }, along: { x: 0, y: 1 } },
  top: { at: { x: 8, y: 6.7 }, along: { x: 1, y: 0 } },
  right: { at: { x: 9.3, y: 8 }, along: { x: 0, y: 1 } },
  bottom: { at: { x: 8, y: 9.3 }, along: { x: 1, y: 0 } },
};

export function heavenSpot(c: Color, i: number, n: number): Point {
  const row = HEAVEN_ROW[player(c).heavenTriangle]!;
  const offset = (i - (n - 1) / 2) * 0.55;
  return { x: (row.at.x + row.along.x * offset) * UNIT, y: (row.at.y + row.along.y * offset) * UNIT };
}

/** Where a man on the track or in his lane stands. Yard and heaven men use yardSpot / heavenSpot. */
export function squareCenter(c: Color, p: Progress): Point {
  if (p === YARD || p === HEAVEN) throw new Error('Yard and heaven men have their own spots');
  if (p <= LAST_TRACK) return centerOf(trackRects[(geometry.players[c].startIndex + p) % TRACK_LENGTH]!);
  return centerOf(laneRects(c)[p - LANE_START]!);
}

/** The track square or lane bar a man stands on, or null in the yard or heaven. */
export function cellOf(c: Color, p: Progress): GridRect | null {
  if (p === YARD || p === HEAVEN) return null;
  if (p <= LAST_TRACK) return trackRects[(geometry.players[c].startIndex + p) % TRACK_LENGTH]!;
  return laneRects(c)[p - LANE_START]!;
}

/**
 * The part of the board to zoom to so these men and squares fill the view, as a square in px.
 * Never closer than `minUnits` grid units across, so there's always some context.
 */
export function zoomBox(c: Color, spots: Progress[], minUnits = 8.5): { x: number; y: number; size: number } {
  const pts: Point[] = [];
  for (const p of spots) {
    if (p === YARD) {
      const [x, y, w, h] = yardRect(c);
      pts.push({ x: x * UNIT, y: y * UNIT }, { x: (x + w) * UNIT, y: (y + h) * UNIT });
    } else if (p === HEAVEN) {
      const [x, y, w, h] = heavenRect;
      pts.push({ x: (x + w / 2) * UNIT, y: (y + h / 2) * UNIT });
    } else {
      const [x, y, w, h] = cellOf(c, p)!;
      pts.push({ x: x * UNIT, y: y * UNIT }, { x: (x + w) * UNIT, y: (y + h) * UNIT });
    }
  }
  if (pts.length === 0) return { x: 0, y: 0, size: BOARD_PX };
  const pad = 1.2 * UNIT;
  const minX = Math.min(...pts.map((p) => p.x)) - pad;
  const maxX = Math.max(...pts.map((p) => p.x)) + pad;
  const minY = Math.min(...pts.map((p) => p.y)) - pad;
  const maxY = Math.max(...pts.map((p) => p.y)) + pad;
  const size = Math.min(BOARD_PX, Math.max(maxX - minX, maxY - minY, minUnits * UNIT));
  const clamp = (v: number) => Math.min(Math.max(v, 0), BOARD_PX - size);
  return { x: clamp((minX + maxX) / 2 - size / 2), y: clamp((minY + maxY) / 2 - size / 2), size };
}
