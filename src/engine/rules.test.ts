// One test (or a few) per scenario in RULES-TESTS.md, numbered the same way.
// Positions are progress values from red's point of view: at(color, n) puts another color's man
// on the square red reaches at progress n, and sq(n) is that square's shared track index.
// 0..LAST_TRACK = track, LANE_START.. = home lane, H = heaven.
import { describe, expect, it } from 'vitest';
import { COLORS, HEAVEN, LANE_START, LAST_TRACK, YARD, lastTrackIndex, locationOf, progressAt, startIndex, trackIndexOf } from './board';
import { applyAction, blocks, createGame, isRevenge } from './engine';
import type { Color } from './types';
import { H, at, moves, pair, play, roll, scenario, single, sorted, sq } from './testkit';

const ONE = { diceMode: 'one' } as const;
const TWO = { diceMode: 'two' } as const;

describe('board', () => {
  it('maps every color onto the geometry', () => {
    for (const c of COLORS) {
      expect(trackIndexOf(c, 0)).toBe(startIndex(c));
      expect(trackIndexOf(c, LAST_TRACK)).toBe(lastTrackIndex(c));
      expect(trackIndexOf(c, LANE_START)).toBeNull();
    }
    // Born one square into the arm, so 46 to the long bar, 5 lane bars, then heaven.
    expect(startIndex('red')).toBe(1);
    expect(LAST_TRACK).toBe(46);
    expect(HEAVEN).toBe(52);
    expect(locationOf('gold', LANE_START)).toEqual({ kind: 'lane', step: 0 });
    expect(locationOf('gold', HEAVEN - 1)).toEqual({ kind: 'lane', step: 4 });
  });

  it('a man is born one square into his arm and never lands on the square behind it', () => {
    for (const c of COLORS) {
      const behind = (startIndex(c) - 1 + 48) % 48;
      for (let p = 0; p <= LAST_TRACK; p++) expect(trackIndexOf(c, p)).not.toBe(behind);
    }
    const born = play(roll(scenario({ rules: { diceMode: 'one' } }), 6), single(YARD, 6));
    expect(locationOf('red', born.men.red.find((p) => p !== YARD)!)).toEqual({ kind: 'track', index: 1 });
  });

  it('starts with every man in the yard and the first seat to roll', () => {
    const s = createGame({ players: [{ id: 'a', name: 'A', color: 'green' }, { id: 'b', name: 'B', color: 'red' }] });
    expect(s.seats).toEqual(['red', 'green']);
    expect(s.men.red).toEqual([YARD, YARD, YARD, YARD]);
    expect(s.men.gold).toEqual([]);
    expect(s.turn).toMatchObject({ color: 'red', phase: 'roll' });
    expect(s.rules).toEqual({ diceMode: 'two', heavenless: false });
  });

  it('rejects bad actions', () => {
    const s = scenario({ rules: ONE, men: { red: [10] } });
    expect(() => roll(s, 3, 4)).toThrow();
    expect(() => roll(s, 7)).toThrow();
    expect(() => play(s, single(10, 3))).toThrow(/Roll first/);
    const rolled = roll(s, 3);
    expect(() => roll(rolled, 3)).toThrow();
    expect(() => play(rolled, single(10, 4))).toThrow(/Illegal/);
  });
});

describe('Getting born', () => {
  it('1. yard man, roll 5 (one die): no legal move', () => {
    const s = roll(scenario({ rules: ONE }), 5);
    expect(s.events).toContainEqual({ type: 'noMoves', color: 'red' });
    expect(s.men.red).toEqual([YARD, YARD, YARD, YARD]);
    expect(s.turn.color).toBe('gold');
  });

  it('2. yard man, roll 6: born on his start square, then roll again', () => {
    let s = roll(scenario({ rules: ONE }), 6);
    expect(moves(s)).toEqual([single(YARD, 6)]);
    s = play(s, single(YARD, 6));
    expect(sorted(s.men.red)).toEqual([YARD, YARD, YARD, 0]);
    expect(locationOf('red', 0)).toEqual({ kind: 'track', index: startIndex('red') });
    expect(s.events).toContainEqual({ type: 'born', color: 'red', count: 1 });
    expect(s.turn).toMatchObject({ color: 'red', phase: 'roll' });
  });

  it('3. two dice 6 + 3: born with the 6, move 3 with the other', () => {
    let s = roll(scenario({ rules: TWO }), 6, 3);
    // The 3 can only be used after the born, so the born must come first.
    expect(moves(s)).toEqual([single(YARD, 6)]);
    s = play(s, single(YARD, 6));
    expect(moves(s)).toEqual([single(0, 3)]);
    s = play(s, single(0, 3));
    expect(sorted(s.men.red)).toEqual([YARD, YARD, YARD, 3]);
    expect(s.turn).toMatchObject({ color: 'red', phase: 'roll' });

    // With a man already out, the 3 can go to any man.
    const t = roll(scenario({ rules: TWO, men: { red: [20] } }), 6, 3);
    expect(moves(t)).toEqual([single(YARD, 6), single(20, 3), single(20, 6)]);
  });

  it('4. two dice 6 + 6: may born two men, who land together as a block', () => {
    let s = roll(scenario({ rules: TWO }), 6, 6);
    expect(moves(s)).toContainEqual(pair(YARD, 6));
    expect(moves(s)).toContainEqual(single(YARD, 6));
    s = play(s, pair(YARD, 6));
    expect(sorted(s.men.red)).toEqual([YARD, YARD, 0, 0]);
    expect(s.events).toContainEqual({ type: 'born', color: 'red', count: 2 });
    expect(s.events).toContainEqual({ type: 'block', color: 'red', trackIndex: sq(0), count: 2 });
    expect(blocks(s)).toEqual([{ color: 'red', trackIndex: sq(0), count: 2 }]);

    // Two separate borns end the same way.
    let u = roll(scenario({ rules: TWO }), 6, 6);
    u = play(play(u, single(YARD, 6)), single(YARD, 6));
    expect(sorted(u.men.red)).toEqual([YARD, YARD, 0, 0]);
  });

  it('5. opponent block on my start square, single 6: I cannot born', () => {
    const goldBlockOnRedStart = { gold: [at('gold', 0), at('gold', 0)] };
    const one = roll(scenario({ rules: ONE, men: goldBlockOnRedStart }), 6);
    expect(one.events).toContainEqual({ type: 'noMoves', color: 'red' });
    expect(one.men.red).toEqual([YARD, YARD, YARD, YARD]);

    const two = roll(scenario({ rules: TWO, men: goldBlockOnRedStart }), 6, 3);
    expect(two.events).toContainEqual({ type: 'noMoves', color: 'red' });

    const withManOut = roll(scenario({ rules: TWO, men: { ...goldBlockOnRedStart, red: [20] } }), 6, 3);
    expect(moves(withManOut).some((m) => m.from === YARD)).toBe(false);
  });

  it('6. opponent block on my start square, 6 + 6: born two as a block and kill theirs', () => {
    let s = roll(scenario({ rules: TWO, men: { gold: [at('gold', 0), at('gold', 0)] } }), 6, 6);
    expect(moves(s)).toEqual([pair(YARD, 6)]);
    s = play(s, pair(YARD, 6));
    expect(sorted(s.men.red)).toEqual([YARD, YARD, 0, 0]);
    expect(s.men.gold).toEqual([YARD, YARD, YARD, YARD]);
    expect(s.events).toContainEqual({ type: 'kill', color: 'red', victim: 'gold', count: 2, trackIndex: sq(0) });
  });
});

describe('Moving and dice', () => {
  // Gold block on track 13. Red man A on 10, man B in his home lane 3 from heaven.
  const blockAt13 = { red: [10, H - 3], gold: [at('gold', 13), at('gold', 13)] };

  it('7a. both dice must be used when any way exists', () => {
    const s = roll(scenario({ rules: TWO, men: blockAt13 }), 3, 2);
    // B+2 would leave the 3 unusable (A+3 lands on the block, B+3 overshoots), so it is not offered.
    expect(moves(s)).toEqual([single(10, 2), single(H - 3, 3)]);
    const done = play(play(s, single(10, 2)), single(H - 3, 3));
    expect(sorted(done.men.red)).toEqual([YARD, YARD, 12, HEAVEN]);
    expect(done.turn.color).toBe('gold');
  });

  it('7b. if only one die can be used, use it', () => {
    let s = roll(scenario({ rules: TWO, men: blockAt13 }), 3, 4);
    expect(moves(s)).toEqual([single(H - 3, 3)]);
    s = play(s, single(H - 3, 3));
    expect(s.turn.color).toBe('gold'); // the 4 is lost
  });

  it('7c. if neither die can be used, the turn passes', () => {
    const s = roll(scenario({ rules: TWO }), 3, 4);
    expect(s.events).toContainEqual({ type: 'noMoves', color: 'red' });
    expect(s.turn).toMatchObject({ color: 'gold', phase: 'roll' });
  });

  it('7d. if only one die can be used, it must be the bigger one when it can move', () => {
    // A on 10, gold block on 17: 10+5 and 10+2 are each fine, but 10+5+2 lands on the block.
    const s = roll(scenario({ rules: TWO, men: { red: [10], gold: [at('gold', 17), at('gold', 17)] } }), 5, 2);
    expect(moves(s)).toEqual([single(10, 5)]);
  });

  it('8. each die can move a different man, or both can move the same man', () => {
    const start = roll(scenario({ rules: TWO, men: { red: [10, 20] } }), 3, 4);
    expect(moves(start)).toEqual([single(10, 3), single(10, 4), single(20, 3), single(20, 4)]);

    const split = play(play(start, single(10, 3)), single(20, 4));
    expect(sorted(split.men.red)).toEqual([YARD, YARD, 13, 24]);

    const same = play(play(start, single(10, 3)), single(13, 4));
    expect(sorted(same.men.red)).toEqual([YARD, YARD, 17, 20]);
  });

  it('9. exact finish: 3 from heaven with a 5 cannot move', () => {
    const s = roll(scenario({ rules: ONE, men: { red: [H - 3, 10] } }), 5);
    expect(moves(s)).toEqual([single(10, 5)]);

    const skipped = roll(scenario({ rules: ONE, men: { red: [H - 3] } }), 5);
    expect(skipped.events).toContainEqual({ type: 'noMoves', color: 'red' });
    expect(skipped.turn.color).toBe('gold');

    const exact = play(roll(scenario({ rules: ONE, men: { red: [H - 3] } }), 3), single(H - 3, 3));
    expect(exact.men.red).toContain(HEAVEN);
    expect(exact.events).toContainEqual({ type: 'heaven', color: 'red', count: 1 });
  });

  it('10. no legal moves at all: the turn passes automatically', () => {
    const one = roll(scenario({ rules: ONE }), 4);
    expect(one.turn).toMatchObject({ color: 'gold', phase: 'roll' });
    const two = roll(scenario({ rules: TWO }), 1, 2);
    expect(two.turn).toMatchObject({ color: 'gold', phase: 'roll' });
  });
});

describe('Sixes', () => {
  it('11. one die, roll 6: one extra roll', () => {
    let s = play(roll(scenario({ rules: ONE, men: { red: [10] } }), 6), single(10, 6));
    expect(s.turn).toMatchObject({ color: 'red', phase: 'roll' });
    s = play(roll(s, 2), single(16, 2));
    expect(s.turn.color).toBe('gold');
  });

  it('12. two dice, 6 + 2: one extra roll', () => {
    let s = roll(scenario({ rules: TWO, men: { red: [10] } }), 6, 2);
    s = play(play(s, single(10, 6)), single(16, 2));
    expect(s.turn).toMatchObject({ color: 'red', phase: 'roll' });
    s = play(play(roll(s, 3, 1), single(18, 3)), single(21, 1));
    expect(s.turn.color).toBe('gold');
  });

  it('13. two dice, 6 + 6: still only one extra roll', () => {
    let s = roll(scenario({ rules: TWO, men: { red: [10] } }), 6, 6);
    s = play(play(s, single(10, 6)), single(16, 6));
    expect(s.turn).toMatchObject({ color: 'red', phase: 'roll' });
    s = play(play(roll(s, 1, 2), single(22, 2)), single(24, 1));
    expect(s.turn.color).toBe('gold');
  });

  it('14. sixes chain with no limit', () => {
    let s = scenario({ rules: ONE, men: { red: [1] } });
    for (const from of [1, 7, 13, 19, 25]) {
      s = play(roll(s, 6), single(from, 6));
      expect(s.turn).toMatchObject({ color: 'red', phase: 'roll' });
    }
    s = play(roll(s, 3), single(31, 3));
    expect(s.turn.color).toBe('gold');
  });
});

describe('Killing', () => {
  it('15. landing exactly on a single opponent man sends him to his yard', () => {
    const s = play(roll(scenario({ rules: ONE, men: { red: [10], gold: [at('gold', 13)] } }), 3), single(10, 3));
    expect(s.men.gold).toEqual([YARD, YARD, YARD, YARD]);
    expect(s.events).toContainEqual({ type: 'kill', color: 'red', victim: 'gold', count: 1, trackIndex: sq(13) });
  });

  it('16. a man on his own start square can still be killed', () => {
    const goldOnStart = { red: [9], gold: [0] };
    expect(trackIndexOf('gold', 0)).toBe(13);
    expect(trackIndexOf('red', 12)).toBe(13);
    const s = play(roll(scenario({ rules: ONE, men: goldOnStart }), 3), single(9, 3));
    expect(s.men.gold).toEqual([YARD, YARD, YARD, YARD]);
  });

  it('17. squares in a home lane are safe', () => {
    // Gold man in his lane. Red runs past gold's turn-off and cannot touch him.
    expect(trackIndexOf('gold', 49)).toBeNull();
    let s = play(roll(scenario({ rules: ONE, men: { red: [10], gold: [49] } }), 1), single(10, 1));
    expect(s.men.red[0]).toBe(11);
    expect(s.men.gold[0]).toBe(49);
    s = scenario({ rules: ONE, men: { red: [8], gold: [49] } });
    s = play(roll(s, 4), single(8, 4));
    expect(s.men.gold[0]).toBe(49);
  });

  it('18. killing does not give a bonus roll', () => {
    const one = play(roll(scenario({ rules: ONE, men: { red: [10], gold: [at('gold', 13)] } }), 3), single(10, 3));
    expect(one.turn).toMatchObject({ color: 'gold', phase: 'roll' });

    let two = roll(scenario({ rules: TWO, men: { red: [10, 20], gold: [at('gold', 13)] } }), 3, 1);
    two = play(play(two, single(10, 3)), single(20, 1));
    expect(two.men.gold).toEqual([YARD, YARD, YARD, YARD]);
    expect(two.turn.color).toBe('gold');
  });
});

describe('Blocks', () => {
  it('19. two or three of my men on one square form a block', () => {
    let s = play(roll(scenario({ rules: TWO, men: { red: [10, 12] } }), 2, 1), single(10, 2));
    expect(s.events).toContainEqual({ type: 'block', color: 'red', trackIndex: sq(12), count: 2 });
    expect(blocks(s)).toEqual([{ color: 'red', trackIndex: sq(12), count: 2 }]);

    s = play(roll(scenario({ rules: ONE, men: { red: [12, 12, 10] } }), 2), single(10, 2));
    expect(blocks(s)).toEqual([{ color: 'red', trackIndex: sq(12), count: 3 }]);
  });

  it('20. a single man cannot pass or land on an opponent block', () => {
    const goldBlock13 = { red: [10], gold: [at('gold', 13), at('gold', 13)] };
    expect(roll(scenario({ rules: ONE, men: goldBlock13 }), 3).events).toContainEqual({ type: 'noMoves', color: 'red' });
    expect(roll(scenario({ rules: ONE, men: goldBlock13 }), 5).events).toContainEqual({ type: 'noMoves', color: 'red' });
    expect(moves(roll(scenario({ rules: ONE, men: goldBlock13 }), 2))).toEqual([single(10, 2)]);
    // Two dice: 2 then 1 (or 1 then 2) ends on the block, so only one die plays, and it must be the 2.
    const two = roll(scenario({ rules: TWO, men: goldBlock13 }), 2, 1);
    expect(moves(two)).toEqual([single(10, 2)]);
    expect(play(two, single(10, 2)).turn.color).toBe('gold');
  });

  it('21. double 4: the block moves together, each man 4', () => {
    let s = roll(scenario({ rules: TWO, men: { red: [10, 10] } }), 4, 4);
    expect(moves(s)).toContainEqual(pair(10, 4));
    s = play(s, pair(10, 4));
    expect(sorted(s.men.red)).toEqual([YARD, YARD, 14, 14]);
    expect(s.turn.color).toBe('gold');
  });

  it('22. double 4: or one man of the block moves 8 and the rest stay', () => {
    let s = roll(scenario({ rules: TWO, men: { red: [10, 10] } }), 4, 4);
    expect(moves(s)).toEqual([pair(10, 4), single(10, 4)]);
    s = play(play(s, single(10, 4)), single(14, 4));
    expect(sorted(s.men.red)).toEqual([YARD, YARD, 10, 18]);
  });

  it('22c. but if he kills 4 ahead, he stops there; the other 4 must move another man', () => {
    let s = roll(scenario({ rules: TWO, men: { red: [10, 10], gold: [at('gold', 14)] } }), 4, 4);
    s = play(s, single(10, 4));
    expect(s.men.gold).toEqual([YARD, YARD, YARD, YARD]);
    expect(moves(s)).toEqual([single(10, 4)]); // not the killer on 14
    s = play(s, single(10, 4));
    expect(sorted(s.men.red)).toEqual([YARD, YARD, 14, 14]);
  });

  it('22b. a block of three: a double moves two of them, the third stays', () => {
    const s = play(roll(scenario({ rules: TWO, men: { red: [10, 10, 10] } }), 4, 4), pair(10, 4));
    expect(sorted(s.men.red)).toEqual([YARD, 10, 14, 14]);
  });

  it('23. a normal roll can move one man off my block, if the path is clear', () => {
    let s = roll(scenario({ rules: TWO, men: { red: [10, 10] } }), 3, 1);
    expect(moves(s)).toEqual([single(10, 1), single(10, 3)]);
    s = play(s, single(10, 3));
    expect(sorted(s.men.red)).toEqual([YARD, YARD, 10, 13]);

    // Gold block on 12: the 3 cannot get past it, the 1 can.
    const blocked = roll(scenario({ rules: TWO, men: { red: [10, 10], gold: [0, 0] } }), 3, 1);
    expect(moves(blocked)).toEqual([single(10, 1)]);
  });

  it('24. only a block kills a block', () => {
    let s = roll(scenario({ rules: TWO, men: { red: [10, 10], gold: [at('gold', 14), at('gold', 14)] } }), 4, 4);
    expect(moves(s)).toEqual([pair(10, 4)]); // a single 4 cannot land on their block
    s = play(s, pair(10, 4));
    expect(s.men.gold).toEqual([YARD, YARD, YARD, YARD]);
    expect(s.events).toContainEqual({ type: 'kill', color: 'red', victim: 'gold', count: 2, trackIndex: sq(14) });
  });

  it('25. my block landing on a single opponent man kills him', () => {
    const s = play(roll(scenario({ rules: TWO, men: { red: [10, 10], gold: [at('gold', 14)] } }), 4, 4), pair(10, 4));
    expect(s.men.gold).toEqual([YARD, YARD, YARD, YARD]);
    expect(sorted(s.men.red)).toEqual([YARD, YARD, 14, 14]);
  });

  it('a block cannot pass another block, even moving together', () => {
    const s = roll(scenario({ rules: TWO, men: { red: [10, 10], gold: [at('gold', 12), at('gold', 12)] } }), 4, 4);
    expect(s.events).toContainEqual({ type: 'noMoves', color: 'red' });
  });
});

describe('A man who kills stays put', () => {
  it('cannot take the other die after a kill; another man must use it', () => {
    let s = roll(scenario({ rules: TWO, men: { red: [10, 20], gold: [at('gold', 13)] } }), 3, 2);
    s = play(s, single(10, 3));
    expect(moves(s)).toEqual([single(20, 2)]);
  });

  it("with no other man to take the other die, he can't kill: he must move the whole count", () => {
    // One man out, an opponent 2 ahead, roll 2 + 5: killing with the 2 would strand the 5,
    // so he has to move the full 7 (5 then 2), jumping past.
    let s = roll(scenario({ rules: TWO, men: { red: [10], gold: [at('gold', 12)] } }), 2, 5);
    expect(moves(s)).toEqual([single(10, 5)]);
    s = play(play(s, single(10, 5)), single(15, 2));
    expect(s.men.red).toContain(17);
    expect(s.men.gold).toContain(at('gold', 12)); // still alive
  });

  it('only if the whole count is impossible too does he kill with one die (rare)', () => {
    // Gold man on 13, gold block on 15: 2 then 3 lands on the block, so the 3 kills and the 2 is wasted.
    let s = roll(
      scenario({ rules: TWO, men: { red: [10], gold: [at('gold', 13), at('gold', 15), at('gold', 15)] } }),
      3,
      2,
    );
    expect(moves(s)).toEqual([single(10, 3)]);
    s = play(s, single(10, 3));
    expect(s.men.gold.filter((p) => p === YARD)).toHaveLength(2); // the killed man is back in the yard
    expect(s.turn.color).toBe('gold'); // the 2 is lost and the turn passes
  });

  it('a kill that would waste a die is not allowed when both dice can be used another way', () => {
    // 3 kills but strands the 1; 1 then 3 jumps the single gold man and uses both.
    const s = roll(scenario({ rules: TWO, men: { red: [10], gold: [at('gold', 13)] } }), 3, 1);
    expect(moves(s)).toEqual([single(10, 1)]);
  });

  it('the killer moves again on the next roll (a 6 still gives one)', () => {
    let s = play(roll(scenario({ rules: ONE, men: { red: [10], gold: [at('gold', 16)] } }), 6), single(10, 6));
    expect(s.turn).toMatchObject({ color: 'red', phase: 'roll' });
    s = roll(s, 2);
    expect(moves(s)).toContainEqual(single(16, 2));
  });
});

describe('Last square before home', () => {
  it('26a. a man on his own long crossing bar can be killed', () => {
    // Gold's long bar is the square red reaches at progress 10.
    const bar = progressAt('red', lastTrackIndex('gold'));
    expect(bar).toBe(10);
    const s = play(roll(scenario({ rules: ONE, men: { red: [bar - 3], gold: [LAST_TRACK] } }), 3), single(bar - 3, 3));
    expect(s.men.gold).toEqual([YARD, YARD, YARD, YARD]);
  });

  it('26b. a man who has turned into his home lane can no longer be killed', () => {
    // Red runs past gold's long bar while gold sits on his first lane bar.
    const s = play(roll(scenario({ rules: ONE, men: { red: [8], gold: [LANE_START] } }), 3), single(8, 3));
    expect(s.men.red[0]).toBe(11);
    expect(trackIndexOf('red', 10)).toBe(lastTrackIndex('gold'));
    expect(s.men.gold[0]).toBe(LANE_START);
  });
});

describe('One-die mode', () => {
  it('26. blocks can still form', () => {
    const s = play(roll(scenario({ rules: ONE, men: { red: [10, 12] } }), 2), single(10, 2));
    expect(blocks(s)).toEqual([{ color: 'red', trackIndex: sq(12), count: 2 }]);
  });

  it('27. blocks cannot be passed, cannot be killed, and cannot move together', () => {
    const goldBlock13 = { gold: [at('gold', 13), at('gold', 13)] };
    // Passed / landed on by a single man.
    expect(roll(scenario({ rules: ONE, men: { ...goldBlock13, red: [10] } }), 5).events).toContainEqual({ type: 'noMoves', color: 'red' });
    // Not even my own block can land on it.
    expect(roll(scenario({ rules: ONE, men: { ...goldBlock13, red: [10, 10] } }), 3).events).toContainEqual({ type: 'noMoves', color: 'red' });
    // No moving together.
    expect(moves(roll(scenario({ rules: ONE, men: { red: [10, 10] } }), 4))).toEqual([single(10, 4)]);
    // A block on my start square stops me being born.
    const onStart = roll(scenario({ rules: ONE, men: { gold: [at('gold', 0), at('gold', 0)] } }), 6);
    expect(onStart.events).toContainEqual({ type: 'noMoves', color: 'red' });
  });

  it('28. a block breaks only when its owner moves a man off it, by choice or when forced', () => {
    const forced = roll(scenario({ rules: ONE, men: { red: [10, 10] } }), 3);
    expect(moves(forced)).toEqual([single(10, 3)]);
    expect(sorted(play(forced, single(10, 3)).men.red)).toEqual([YARD, YARD, 10, 13]);

    const choice = roll(scenario({ rules: ONE, men: { red: [10, 10, 20] } }), 3);
    expect(moves(choice)).toEqual([single(10, 3), single(20, 3)]);
    expect(blocks(play(choice, single(20, 3)))).toEqual([{ color: 'red', trackIndex: sq(10), count: 2 }]);
  });
});

describe('Winning', () => {
  it('29. first player with all 4 in heaven wins; play continues for the other places', () => {
    let s = scenario({
      colors: ['red', 'gold', 'green'],
      rules: ONE,
      men: { red: [H, H, H, H - 3], gold: [H, H, H, H - 3] },
    });
    s = play(roll(s, 3), single(H - 3, 3));
    expect(s.placements).toEqual(['red']);
    expect(s.events).toContainEqual({ type: 'finished', playerId: 'red', place: 1 });
    expect(s.status).toBe('playing');
    expect(s.turn.color).toBe('gold');

    s = play(roll(s, 1), single(H - 3, 1)); // gold to H - 2
    s = roll(s, 2); // green has nothing to move
    expect(s.turn.color).toBe('gold'); // red is skipped from now on

    s = play(roll(s, 2), single(H - 2, 2));
    expect(s.status).toBe('over');
    expect(s.result).toEqual({ kind: 'placed', placements: ['red', 'gold', 'green'] });
  });

  it('29b. two players: the first one home ends the game; a final 6 gives no extra roll', () => {
    const duel = { colors: ['red', 'green'] as Color[], rules: ONE };
    const s = play(roll(scenario({ ...duel, men: { red: [H, H, H, LAST_TRACK] } }), 6), single(LAST_TRACK, 6));
    expect(s.status).toBe('over');
    expect(s.result).toEqual({ kind: 'placed', placements: ['red', 'green'] });
    expect(() => roll(s, 3)).toThrow(/over/);
  });

  it('29c. two players sit diagonally, one color each; the other two yards stay empty', () => {
    const p = (id: string, color: Color) => ({ id, name: id, color });
    const s = createGame({ players: [p('a', 'gold'), p('b', 'black')] });
    expect(s.seats).toEqual(['gold', 'black']);
    expect(s.men.red).toEqual([]);
    expect(s.men.green).toEqual([]);
    expect(blocks(s)).toEqual([]);
    expect(createGame({ players: [p('a', 'red'), p('b', 'green')] }).seats).toEqual(['red', 'green']);

    expect(() => createGame({ players: [p('a', 'red'), p('b', 'gold')] })).toThrow(/diagonal/);
    expect(() => createGame({ players: [p('a', 'gold'), p('b', 'green')] })).toThrow(/diagonal/);
    // Three or four players can take any colors.
    expect(createGame({ players: [p('a', 'red'), p('b', 'gold'), p('c', 'black')] }).seats).toEqual(['red', 'gold', 'black']);
  });

  it('30. heaven-less ON: once every player has a man in heaven, it is a draw', () => {
    const s = play(
      roll(
        scenario({ colors: ['red', 'green'], rules: { ...ONE, heavenless: true }, men: { red: [H, 10], green: [H - 3] }, turn: 'green' }),
        3,
      ),
      single(H - 3, 3),
    );
    expect(s.status).toBe('over');
    expect(s.result).toEqual({ kind: 'draw' });
    expect(s.events).toContainEqual({ type: 'gameOver', result: { kind: 'draw' } });
  });

  it('31. heaven-less OFF: that never ends the game', () => {
    const s = play(
      roll(scenario({ colors: ['red', 'green'], rules: ONE, men: { red: [H, 10], green: [H - 3] }, turn: 'green' }), 3),
      single(H - 3, 3),
    );
    expect(s.status).toBe('playing');
    expect(s.turn.color).toBe('red');
  });
});

describe('Stats', () => {
  it('counts kills per killer and victim, block kills as two', () => {
    let s = play(roll(scenario({ rules: ONE, men: { red: [10], gold: [at('gold', 13)] } }), 3), single(10, 3));
    expect(s.stats.kills.red).toBe(1);
    expect(s.stats.killed.gold).toBe(1);
    expect(s.stats.killsBy.red.gold).toBe(1);

    s = play(roll(scenario({ rules: TWO, men: { red: [10, 10], green: [at('green', 14), at('green', 14)] } }), 4, 4), pair(10, 4));
    expect(s.stats.kills.red).toBe(2);
    expect(s.stats.killsBy.red.green).toBe(2);
  });

  it('remembers who last killed whom, so a pay-back counts as revenge, once', () => {
    let s = play(roll(scenario({ rules: ONE, men: { red: [10], gold: [at('gold', 13)] } }), 3), single(10, 3));
    expect(s.stats.lastKiller?.gold).toBe('red');
    expect(isRevenge(s.stats, 'gold', 'red')).toBe(true); // gold owes red one
    expect(isRevenge(s.stats, 'green', 'red')).toBe(false);
    // Gold kills red back: revenge is paid, and now red owes gold.
    s = { ...s, men: { ...s.men, gold: [at('gold', 17)], red: [20] }, turn: { ...s.turn, seat: 1, color: 'gold', phase: 'roll' } };
    s = play(roll(s, 3), single(at('gold', 17), 3));
    expect(s.men.red[0]).toBe(-1);
    expect(s.stats.lastKiller?.gold).toBeUndefined();
    expect(s.stats.lastKiller?.red).toBe('gold');
  });

  it('counts dice and sixes per color', () => {
    let s = roll(scenario({ rules: TWO, men: { red: [10] } }), 6, 6);
    expect(s.stats.sixes.red).toBe(2);
    expect(s.stats.dice.red).toBe(2);
    s = roll(play(play(s, single(10, 6)), single(16, 6)), 6, 2);
    expect(s.stats.sixes.red).toBe(3);
    expect(s.stats.dice.red).toBe(4);
  });
});

describe('Engine purity', () => {
  it('never mutates the state it is given', () => {
    const s = roll(scenario({ rules: TWO, men: { red: [10, 10], gold: [at('gold', 14)] } }), 4, 4);
    const before = JSON.stringify(s);
    applyAction(s, { type: 'move', move: pair(10, 4) });
    applyAction(s, { type: 'move', move: single(10, 4) });
    expect(JSON.stringify(s)).toBe(before);
  });
});
