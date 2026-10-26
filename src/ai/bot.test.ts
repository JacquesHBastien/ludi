import { describe, expect, it } from 'vitest';
import { applyAction, createGame, type BotLevel, type Color, type GameState } from '../engine';
import { at, roll, scenario, single } from '../engine/testkit';
import { chooseMove, hitChance } from './bot';
import { BOT_NAMES, botName } from './names';

/** Small seeded random so the simulated games are repeatable. */
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Play a whole game between bots. Returns the finished state and how many actions it took. */
function playOut(levels: Partial<Record<Color, BotLevel>>, seed: number, diceMode: 'one' | 'two' = 'two') {
  const random = seeded(seed);
  const die = () => 1 + Math.floor(random() * 6);
  let s: GameState = createGame({
    players: (Object.keys(levels) as Color[]).map((c) => ({ id: c, name: c, color: c, computer: levels[c] })),
    rules: { diceMode },
  });
  let actions = 0;
  while (s.status === 'playing' && actions < 5000) {
    if (s.turn.phase === 'roll') s = applyAction(s, { type: 'roll', dice: diceMode === 'two' ? [die(), die()] : [die()] });
    else s = applyAction(s, { type: 'move', move: chooseMove(s, s.players.find((p) => p.color === s.turn.color)!.computer!, random) });
    actions++;
  }
  return { s, actions };
}

describe('computer players', () => {
  it.each(['easy', 'medium', 'hard'] as const)('%s bots always find a legal move and finish the game', (level) => {
    for (const seed of [1, 2, 3]) {
      const { s, actions } = playOut({ red: level, gold: level, green: level, black: level }, seed);
      expect(s.status).toBe('over');
      expect(actions).toBeLessThan(5000);
    }
  });

  it('also finishes one-die games', () => {
    expect(playOut({ red: 'hard', green: 'medium' }, 7, 'one').s.status).toBe('over');
  });

  it('takes a kill when it can', () => {
    // Red can kill gold 3 ahead, or move another man 3 into empty track.
    const s = roll(scenario({ rules: { diceMode: 'one' }, men: { red: [10, 30], gold: [at('gold', 13)] } }), 3);
    expect(chooseMove(s, 'medium')).toEqual(single(10, 3));
    expect(chooseMove(s, 'hard')).toEqual(single(10, 3));
  });

  it('knows a lone man must move the whole count, so standing in front of him is safer', () => {
    // 2 ahead of a player with several men out: either die showing 2, or 1 + 1.
    expect(hitChance(2, true)).toBeCloseTo(12 / 36);
    // 2 ahead of a lone man: only 1 + 1, or 6 + 2 (born with the 6, kill with the 2).
    expect(hitChance(2, true, true, true)).toBeCloseTo(3 / 36);
    // ...and with nobody left in his yard to born, only the sum.
    expect(hitChance(2, true, true, false)).toBeCloseTo(1 / 36);
    expect(hitChance(7, true, true, true)).toBeCloseTo(6 / 36);
  });

  it('hard beats easy most of the time', () => {
    let hardWins = 0;
    const games = 24;
    for (let seed = 100; seed < 100 + games; seed++) {
      const { s } = playOut({ red: 'hard', green: 'easy' }, seed);
      if (s.placements[0] === 'red') hardWins++;
    }
    expect(hardWins).toBeGreaterThanOrEqual(games * 0.7);
  });

  it('has 50 names and never repeats one at the table', () => {
    expect(new Set(BOT_NAMES).size).toBe(50);
    const taken = BOT_NAMES.slice(0, 49);
    expect(botName(taken)).toBe(BOT_NAMES[49]);
  });
});
