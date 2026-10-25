// Pure helpers the game screen uses to turn engine state into taps, labels and moments.
import { HEAVEN, YARD, applyAction, legalMoves, sameMove, type Color, type GameEvent, type GameState, type Move, type Progress } from '../engine';

/** Which of the rolled dice are already used, given the dice still left. On a double the left die goes first. */
export function usedFlags(rolled: number[], remaining: number[]): boolean[] {
  const left = [...remaining];
  const flags = [...rolled].reverse().map((d) => {
    const i = left.indexOf(d);
    if (i < 0) return true;
    left.splice(i, 1);
    return false;
  });
  return flags.reverse();
}

/** Where a move (or a chain of moves on one man) ends up. */
export function landing(moves: Move[]): Progress {
  let p = moves[0]!.from;
  for (const m of moves) p = p === YARD ? 0 : p + m.die;
  return p;
}

/** Indexes into `turn.rolled` of dice that are unused and can start at least one legal move. */
export function usableDice(state: GameState): number[] {
  const legal = legalMoves(state);
  const used = usedFlags(state.turn.rolled, state.turn.dice);
  return state.turn.rolled.flatMap((d, i) => (!used[i] && legal.some((m) => m.die === d) ? [i] : []));
}

/**
 * What tapping the men on `from` does with the picked dice.
 * One die: move one man by it. Both dice: on a double, a block moves together (or a double 6 borns two);
 * otherwise one man moves by both, one die after the other. Null when the tap can't do anything.
 */
export function planTap(state: GameState, from: Progress, picked: number[]): Move[] | null {
  const legal = legalMoves(state);
  const fits = (m: Move) => legal.some((l) => sameMove(l, m));
  if (picked.length === 1) {
    const m: Move = { kind: 'single', from, die: picked[0]! };
    return fits(m) ? [m] : null;
  }
  if (picked.length !== 2) return null;
  const [a, b] = picked as [number, number];
  if (a === b && fits({ kind: 'pair', from, die: a })) return [{ kind: 'pair', from, die: a }];
  for (const [first, second] of [
    [a, b],
    [b, a],
  ] as const) {
    const m1: Move = { kind: 'single', from, die: first };
    if (!fits(m1)) continue;
    const after = applyAction(state, { type: 'move', move: m1 });
    if (after.turn.color !== state.turn.color || after.turn.phase !== 'move') continue;
    const m2: Move = { kind: 'single', from: landing([m1]), die: second };
    if (legalMoves(after).some((l) => sameMove(l, m2))) return [m1, m2];
  }
  return null;
}

/** The squares whose men can be tapped with the picked dice, and where each would land. */
export function tapTargets(state: GameState, picked: number[]): { from: Progress; to: Progress }[] {
  if (picked.length === 0) return [];
  const froms = [...new Set(state.men[state.turn.color].filter((p) => p !== HEAVEN))];
  return froms.flatMap((from) => {
    const plan = planTap(state, from, picked);
    return plan ? [{ from, to: landing(plan) }] : [];
  });
}

export type Moment =
  | { kind: 'kill'; color: Color; victim: Color; count: number; bounty?: boolean; taunt?: string }
  | { kind: 'born'; color: Color; count: number; rollAgain: boolean }
  | { kind: 'block'; color: Color; count: number }
  | { kind: 'heaven'; color: Color; home: number };

/** The one big moment worth showing for an action, most important first: heaven, kill, born, block.
 * (Borning two men on a double 6 makes a block too; "Yuh born!" is the bigger moment.) */
export function pickMoment(after: GameState, actor: Color): Moment | null {
  const ev = after.events;
  const find = <T extends GameEvent['type']>(type: T) =>
    ev.find((e): e is Extract<GameEvent, { type: T }> => e.type === type);

  const heaven = find('heaven');
  if (heaven) return { kind: 'heaven', color: actor, home: after.men[actor].filter((p) => p === HEAVEN).length };
  const kill = find('kill');
  if (kill) return { kind: 'kill', color: actor, victim: kill.victim, count: kill.count };
  const born = find('born');
  if (born) {
    const rollAgain = after.turn.color === actor && after.turn.phase === 'roll';
    return { kind: 'born', color: actor, count: born.count, rollAgain };
  }
  const block = find('block');
  if (block) return { kind: 'block', color: actor, count: block.count };
  return null;
}

/** The color that plays after `color`, skipping colors with every man in heaven. */
export function nextColor(state: GameState, color: Color): Color {
  const { seats } = state;
  let i = seats.indexOf(color);
  for (let n = 0; n < seats.length; n++) {
    i = (i + 1) % seats.length;
    if (!state.men[seats[i]!].every((p) => p === HEAVEN)) return seats[i]!;
  }
  return color;
}

/** Finishing order: players already home in order, then the rest by men in heaven and distance covered. */
export function ranking(state: GameState): Color[] {
  const placed = state.placements.map((id) => state.players.find((p) => p.id === id)!.color);
  const score = (c: Color) => {
    const men = state.men[c];
    return men.filter((p) => p === HEAVEN).length * 1000 + men.reduce((sum, p) => sum + Math.max(p, 0), 0);
  };
  const rest = state.seats.filter((c) => !placed.includes(c)).sort((a, b) => score(b) - score(a));
  return [...placed, ...rest];
}
