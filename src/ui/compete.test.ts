import { describe, expect, it } from 'vitest';
import { LAST_TRACK, YARD, legalMoves, progressAt, trackIndexOf, type GameState } from '../engine';
import { H, play, roll, scenario, single } from '../engine/testkit';
import { TAUNT_LISTS, awards, bounties, bountyKills, pickTaunt, rivalry } from './compete';

const withStats = (s: GameState, patch: Partial<GameState['stats']>): GameState => ({ ...s, stats: { ...s.stats, ...patch } });

describe('bounty', () => {
  it("marks a player's first man near home, but only while he can still be killed", () => {
    const s = scenario({ men: { gold: [LAST_TRACK - 3, 10], green: [LAST_TRACK + 2] } });
    expect(bounties(s)).toEqual([{ color: 'gold', from: LAST_TRACK - 3, kind: 'first' }]); // green's is safe in his lane
  });

  it('stops once a man is home, until only the last man is left', () => {
    expect(bounties(scenario({ men: { gold: [H, LAST_TRACK - 2] } }))).toEqual([]);
    expect(bounties(scenario({ men: { gold: [H, H, H, LAST_TRACK - 5] } }))).toEqual([{ color: 'gold', from: LAST_TRACK - 5, kind: 'last' }]);
    expect(bounties(scenario({ men: { gold: [LAST_TRACK - 10] } }))).toEqual([]); // 11 away: not yet
  });

  it('finds the moves that would kill a bounty man', () => {
    // Gold's first man is 2 from his home lane; red stands 3 squares behind him.
    const goldMan = LAST_TRACK - 2;
    const redP = progressAt('red', trackIndexOf('gold', goldMan)!) - 3;
    const s = roll(scenario({ rules: { diceMode: 'one' }, men: { red: [redP, 2], gold: [goldMan] } }), 3);
    expect(bountyKills(s, legalMoves(s))).toEqual([single(redP, 3)]);
    expect(play(s, single(redP, 3)).men.gold[0]).toBe(YARD);
  });
});

describe('rivalry', () => {
  it('names who has killed you most, then whom you have killed most', () => {
    const s = scenario({});
    expect(rivalry(s, 'red')).toBeNull();
    const hunted = withStats(s, { killsBy: { ...s.stats.killsBy, gold: { red: 3 }, green: { red: 1 } } });
    expect(rivalry(hunted, 'red')).toEqual({ other: 'gold', count: 3, kind: 'hunted' });
    const hunter = withStats(s, { killsBy: { ...s.stats.killsBy, red: { black: 2 } } });
    expect(rivalry(hunter, 'red')).toEqual({ other: 'black', count: 2, kind: 'hunter' });
  });
});

describe('awards', () => {
  it('gives each award to the leader, shares ties, and skips awards nobody earned', () => {
    const s0 = scenario({ colors: ['red', 'green'], men: { red: [10], green: [20] } });
    expect(awards(s0, false)).toEqual([]);
    const s = withStats(s0, {
      kills: { ...s0.stats.kills, red: 3, green: 1 },
      killed: { ...s0.stats.killed, green: 3, red: 1 },
      sixes: { ...s0.stats.sixes, red: 5, green: 5 },
    });
    const list = awards(s, false);
    expect(list.map((a) => [a.id, a.colors])).toEqual([
      ['butcher', ['red']],
      ['unlucky', ['green']],
      ['sixes', ['red', 'green']],
    ]);
    expect(list[0]!.detail).toBe('3 kills');
    expect(awards(s, true)[0]!.title).toBe('Bad Man a di Yard');
  });
});

describe('taunts', () => {
  it('has a plain line for every Patois line and never repeats the last one', () => {
    expect(TAUNT_LISTS.patois.length).toBe(TAUNT_LISTS.plain.length);
    let last: string | null = null;
    for (let i = 0; i < 50; i++) {
      const t = pickTaunt(true, last);
      expect(t).not.toBe(last);
      last = t;
    }
  });
});
