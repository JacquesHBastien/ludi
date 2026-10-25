import { describe, expect, it } from 'vitest';
import { YARD } from '../engine';
import { H, at, pair, play, roll, scenario, single } from '../engine/testkit';
import { nextColor, optionLabel, optionsAt, pickMoment, ranking, usedFlags } from './turn';

describe('turn helpers', () => {
  it('marks used dice, including doubles', () => {
    expect(usedFlags([6, 3], [6, 3])).toEqual([false, false]);
    expect(usedFlags([6, 3], [3])).toEqual([true, false]);
    expect(usedFlags([4, 4], [4])).toEqual([true, false]);
    expect(usedFlags([4, 4], [])).toEqual([true, true]);
  });

  it('offers a choice when tapping a block on a double', () => {
    const s = roll(scenario({ men: { red: [10, 10] } }), 4, 4);
    const legal = [single(10, 4), pair(10, 4)];
    expect(optionsAt(legal, 10, null)).toEqual([pair(10, 4), single(10, 4)]);
    expect(optionLabel(pair(10, 4), 2)).toBe('Move both men 4');
    expect(optionLabel(single(10, 4), 2)).toBe('Move one man 4');
    expect(optionLabel(single(YARD, 6), 3)).toBe('Born a man');
    expect(s.turn.phase).toBe('move');
  });

  it('narrows choices to the picked die', () => {
    const legal = [single(10, 3), single(10, 4), single(20, 3)];
    expect(optionsAt(legal, 10, 4)).toEqual([single(10, 4)]);
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
