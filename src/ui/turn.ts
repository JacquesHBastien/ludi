// Pure helpers the game screen uses to turn engine state into taps, labels and moments.
import { HEAVEN, YARD, type Color, type GameEvent, type GameState, type Move, type Progress } from '../engine';

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

/** Legal moves that fit the die the player picked (a pair move fits either die of the double). */
export function movesForDie(legal: Move[], die: number | null): Move[] {
  return die === null ? legal : legal.filter((m) => m.die === die);
}

/** The choices for tapping the men on one square. Moving a block together is listed first. */
export function optionsAt(legal: Move[], from: Progress, die: number | null): Move[] {
  const here = movesForDie(legal, die).filter((m) => m.from === from);
  return [...here.filter((m) => m.kind === 'pair'), ...here.filter((m) => m.kind !== 'pair')];
}

/** Button text for a move when a tap has more than one meaning. */
export function optionLabel(m: Move, menHere: number): string {
  if (m.from === YARD) return m.kind === 'pair' ? 'Born two men' : 'Born a man';
  if (m.kind === 'pair') return `Move both men ${m.die}`;
  return menHere > 1 ? `Move one man ${m.die}` : `Move ${m.die}`;
}

export type Moment =
  | { kind: 'kill'; color: Color; victim: Color; count: number }
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
