import { describe, expect, it } from 'vitest';
import { BOARD_PX } from './layout';
import { ricochet } from './ricochet';

describe('ricochet', () => {
  it('bounces off the frame the right number of times, then lands home', () => {
    const home = { x: 50, y: 50 };
    const legs = ricochet({ x: 168, y: 100 }, { x: 1, y: 0.4 }, 3, home);
    expect(legs).toHaveLength(4);
    for (const leg of legs.slice(0, 3)) {
      const onWall = [leg.to.x, leg.to.y].some((v) => Math.abs(v - 16) < 0.01 || Math.abs(v - (BOARD_PX - 16)) < 0.01);
      expect(onWall).toBe(true);
    }
    expect(legs.at(-1)!.to).toEqual(home);
    expect(legs.reduce((a, l) => a + l.share, 0)).toBeCloseTo(1);
  });

  it('stays inside the board', () => {
    for (const leg of ricochet({ x: 300, y: 30 }, { x: -0.3, y: -1 }, 5, { x: 280, y: 280 })) {
      expect(leg.to.x).toBeGreaterThanOrEqual(0);
      expect(leg.to.x).toBeLessThanOrEqual(BOARD_PX);
      expect(leg.to.y).toBeGreaterThanOrEqual(0);
      expect(leg.to.y).toBeLessThanOrEqual(BOARD_PX);
    }
  });
});
