import { describe, expect, it } from 'vitest';
import { shakePower } from './throw';

describe('hold to shake', () => {
  it('a quick tap is a soft throw, a long shake tops out', () => {
    expect(shakePower(0)).toBeCloseTo(0.3);
    expect(shakePower(550)).toBeCloseTo(0.8);
    expect(shakePower(1320)).toBeCloseTo(1.5);
    expect(shakePower(5000)).toBe(1.5);
  });
});
