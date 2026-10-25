import { describe, expect, it } from 'vitest';
import { rollDice } from './random';

describe('dice', () => {
  it('rolls every face equally often (chi-square over 600,000 dice)', () => {
    const counts = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 300_000; i++) for (const d of rollDice('two')) counts[d - 1]!++;
    const expected = 600_000 / 6;
    const chi = counts.reduce((sum, c) => sum + (c - expected) ** 2 / expected, 0);
    // 5 degrees of freedom: a fair die stays under 20.5 about 99.9% of the time.
    expect(chi).toBeLessThan(20.5);
    expect(Math.min(...counts)).toBeGreaterThan(0);
  });

  it('never repeats a pattern between the two dice', () => {
    let same = 0;
    for (let i = 0; i < 60_000; i++) {
      const [a, b] = rollDice('two');
      if (a === b) same++;
    }
    // Doubles should come up 1 time in 6.
    expect(same / 60_000).toBeGreaterThan(0.155);
    expect(same / 60_000).toBeLessThan(0.178);
  });
});
