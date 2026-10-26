import { describe, expect, it } from 'vitest';
import { YARD } from '../engine';
import { H, at, pair, play, roll, scenario, single } from '../engine/testkit';
import { landing, nextColor, pickMoment, planTap, ranking, tapTargets, usableDice, usedFlags } from './turn';

describe('turn helpers', () => {
  it('marks used dice, including doubles', () => {
    expect(usedFlags([6, 3], [6, 3])).toEqual([false, false]);
    expect(usedFlags([6, 3], [3])).toEqual([true, false]);
    expect(usedFlags([4, 4], [4])).toEqual([true, false]);
    expect(usedFlags([4, 4], [])).toEqual([true, true]);
  });

  it('one picked die moves one man by that die', () => {
    const s = roll(scenario({ men: { red: [10, 20] } }), 3, 4);
    expect(planTap(s, 10, [3])).toEqual([single(10, 3)]);
    expect(planTap(s, 20, [4])).toEqual([single(20, 4)]);
    expect(planTap(s, 10, [])).toBeNull();
    expect(tapTargets(s, [4])).toEqual([
      { from: 10, to: 14 },
      { from: 20, to: 24 },
    ]);
  });

  it('both dice picked: a block moves together on a double, a single man takes both', () => {
    const s = roll(scenario({ men: { red: [10, 10, 20] } }), 4, 4);
    expect(planTap(s, 10, [4, 4])).toEqual([pair(10, 4)]);
    expect(planTap(s, 20, [4, 4])).toEqual([single(20, 4), single(24, 4)]);
    // One die picked on the block splits one man off.
    expect(planTap(s, 10, [4])).toEqual([single(10, 4)]);

    const t = roll(scenario({ men: { red: [10] } }), 3, 5);
    expect(planTap(t, 10, [3, 5])).toEqual([single(10, 3), single(13, 5)]);
    expect(landing(planTap(t, 10, [3, 5])!)).toBe(18);
  });

  it('both sixes on the yard borns two; tries the other order when one is blocked', () => {
    const s = roll(scenario({}), 6, 6);
    expect(planTap(s, YARD, [6, 6])).toEqual([pair(YARD, 6)]);
    // Gold block 3 ahead of red: 3 then 2 lands on it, 2 then 3 passes it; neither works.
    const blocked = roll(scenario({ men: { red: [10], gold: [at('gold', 13), at('gold', 13)] } }), 3, 2);
    expect(planTap(blocked, 10, [3, 2])).toBeNull();
  });

  it('both dice on one man never kills on the first hop and carries on', () => {
    // 3 first would kill gold on 13 and leave him stuck, so the tap plays 5 then 3 instead.
    const s = roll(scenario({ men: { red: [10, 20], gold: [at('gold', 13)] } }), 3, 5);
    expect(planTap(s, 10, [3, 5])).toEqual([single(10, 5), single(15, 3)]);
    // With the 5 blocked, there's no way to use both on that man.
    const t = roll(scenario({ men: { red: [10, 20], gold: [at('gold', 13), at('gold', 15), at('gold', 15)] } }), 3, 5);
    expect(planTap(t, 10, [3, 5])).toBeNull();
  });

  it('only offers dice that can move something', () => {
    const s = roll(scenario({ men: { red: [H - 3] } }), 3, 5);
    expect(usableDice(s)).toEqual([0]); // the 5 overshoots heaven
  });

  it('picks the most important moment', () => {
    const kill = play(roll(scenario({ rules: { diceMode: 'one' }, men: { red: [10], gold: [at('gold', 13)] } }), 3), single(10, 3));
    expect(pickMoment(kill, 'red')).toEqual({ kind: 'kill', color: 'red', victim: 'gold', count: 1 });

    const born = play(roll(scenario({ rules: { diceMode: 'one' } }), 6), single(YARD, 6));
    expect(pickMoment(born, 'red')).toEqual({ kind: 'born', color: 'red', count: 1, rollAgain: true });

    const bornTwo = play(roll(scenario({}), 6, 6), pair(YARD, 6));
    expect(pickMoment(bornTwo, 'red')).toEqual({ kind: 'born', color: 'red', count: 2, rollAgain: true });

    const heaven = play(roll(scenario({ rules: { diceMode: 'one' }, men: { red: [H - 3] } }), 3), single(H - 3, 3));
    expect(pickMoment(heaven, 'red')).toEqual({ kind: 'heaven', color: 'red', home: 1 });
  });

  it('skips finished colors and ranks players', () => {
    const s = scenario({ men: { red: [H, H, H, H], green: [H, 10] } });
    expect(nextColor(s, 'black')).toBe('gold');
    expect(ranking(s)).toEqual(['red', 'green', 'gold', 'black']);
  });
});
