import { describe, expect, it } from 'vitest';
import { COLORS, HEAVEN, LAST_TRACK, TRACK_LENGTH, trackIndexOf } from '../engine';
import { UNIT, heavenRect, heavenSpot, laneRects, squareCenter, trackRects, yardRect, yardSpot, type GridRect, type Point } from './layout';

const inside = (pt: Point, [x, y, w, h]: GridRect, pad = 0) =>
  pt.x >= (x + pad) * UNIT && pt.x <= (x + w - pad) * UNIT && pt.y >= (y + pad) * UNIT && pt.y <= (y + h - pad) * UNIT;

describe('board layout', () => {
  it('puts every track and lane man on his own square', () => {
    for (const c of COLORS) {
      for (let p = 0; p <= LAST_TRACK; p++) expect(inside(squareCenter(c, p), trackRects[trackIndexOf(c, p)!]!)).toBe(true);
      for (let step = 0; step < 5; step++) expect(inside(squareCenter(c, TRACK_LENGTH + step), laneRects(c)[step]!)).toBe(true);
    }
  });

  it('keeps yard sockets in the yard and heaven men in heaven', () => {
    for (const c of COLORS) {
      for (let n = 0; n < 4; n++) expect(inside(yardSpot(c, n), yardRect(c), 0.6)).toBe(true);
      for (let i = 0; i < 4; i++) expect(inside(heavenSpot(c, i, 4), heavenRect, 0.3)).toBe(true);
    }
    expect(() => squareCenter('red', HEAVEN)).toThrow();
  });
});
