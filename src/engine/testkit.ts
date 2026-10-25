// Helpers for building exact board positions in tests. Not used by the app.
import { MEN_PER_COLOR, YARD, progressAt } from './board';
import { applyAction, createGame, legalMoves } from './engine';
import type { Color, GameState, Move, Progress, Rules } from './types';

export interface Scenario {
  colors?: Color[];
  rules?: Partial<Rules>;
  /** Progress per color. Missing men are filled in as yard men. */
  men?: Partial<Record<Color, Progress[]>>;
  turn?: Color;
}

/** One player per color, id = color name. Red's progress equals the track index. All four colors by default. */
export function scenario({ colors = ['red', 'gold', 'green', 'black'], rules, men = {}, turn }: Scenario): GameState {
  const state = createGame({
    players: colors.map((c) => ({ id: c, name: c, color: c })),
    rules,
    firstColor: turn,
  });
  for (const c of colors) {
    const list = [...(men[c] ?? [])];
    while (list.length < MEN_PER_COLOR) list.push(YARD);
    state.men[c] = list;
  }
  return state;
}

/** Progress for a man of `color` standing on shared track index `trackIndex`. */
export const at = (color: Color, trackIndex: number): Progress => progressAt(color, trackIndex);

export const roll = (s: GameState, ...dice: number[]) => applyAction(s, { type: 'roll', dice });

export const single = (from: Progress, die: number): Move => ({ kind: 'single', from, die });
export const pair = (from: Progress, die: number): Move => ({ kind: 'pair', from, die });

export const play = (s: GameState, m: Move) => applyAction(s, { type: 'move', move: m });

/** Legal moves sorted for stable comparison. */
export function moves(s: GameState): Move[] {
  return [...legalMoves(s)].sort((a, b) => a.kind.localeCompare(b.kind) || a.from - b.from || a.die - b.die);
}

export const sorted = (list: Progress[]) => [...list].sort((a, b) => a - b);
