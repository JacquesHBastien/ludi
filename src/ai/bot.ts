// Computer players. Pure functions over engine state: pick one legal move for the color to play.
// Dice stay random for everyone; the bot only decides what to do with them.
import {
  HEAVEN,
  LANE_START,
  LAST_TRACK,
  YARD,
  applyAction,
  legalMoves,
  progressAt,
  startIndex,
  trackIndexOf,
  type BotLevel,
  type Color,
  type GameState,
  type Move,
  type Progress,
} from '../engine';

/** How much a man is worth where he stands: out of the yard, distance covered, safe in the lane, home. */
function worth(p: Progress): number {
  if (p === YARD) return 0;
  if (p === HEAVEN) return 100;
  if (p >= LANE_START) return 62 + (p - LANE_START) * 2;
  return 8 + p;
}

/** Ways (out of 36) two dice add up to d. */
const sumWays = (d: number) => (d < 2 || d > 12 ? 0 : d <= 7 ? d - 1 : 13 - d);

/**
 * Chance an opponent's man `d` squares behind can land on you next turn.
 * `lone`: he is that player's only man out. Then a single die can't kill you on most rolls,
 * because a killer must stop and the other die would have nowhere to go: he has to move the
 * whole count. He only hits on the sum, or with a 6 he can spend borning a man (`canBorn`).
 */
export function hitChance(d: number, twoDice: boolean, lone = false, canBorn = false): number {
  if (d < 1) return 0;
  if (!twoDice) return d <= 6 ? 1 / 6 : 0;
  if (!lone) return ((d <= 6 ? 11 : 0) + sumWays(d)) / 36;
  let ways = sumWays(d);
  if (canBorn) {
    if (d <= 5) ways += 2; // 6 + d: born with the 6, kill with the d
    if (d === 6) ways += 1; // double 6: kill with one, born with the other
  }
  return ways / 36;
}

interface Weights {
  /** How much the bot cares about opponents' progress (so kills pay). */
  theirs: number;
  /** How much it fears being hit. */
  danger: number;
  /** Bonus per block, and per block parked on an opponent's start square. */
  block: number;
  blockOnStart: number;
}

const WEIGHTS: Record<Exclude<BotLevel, 'easy'>, Weights> = {
  medium: { theirs: 0.6, danger: 0.25, block: 2, blockOnStart: 4 },
  hard: { theirs: 0.75, danger: 0.9, block: 4, blockOnStart: 12 },
};

/** How good this position looks for `me`. */
export function evaluate(state: GameState, me: Color, w: Weights): number {
  const twoDice = state.rules.diceMode === 'two';
  const others = state.seats.filter((c) => c !== me);
  let score = 0;

  for (const p of state.men[me]) score += worth(p);
  for (const o of others) for (const p of state.men[o]) score -= w.theirs * worth(p);

  // Blocks, especially one sitting on someone's start square while they still have men to born.
  const onSquare = new Map<number, number>();
  for (const p of state.men[me]) {
    const idx = trackIndexOf(me, p);
    if (idx !== null) onSquare.set(idx, (onSquare.get(idx) ?? 0) + 1);
  }
  for (const [idx, n] of onSquare) {
    if (n < 2) continue;
    score += w.block;
    if (others.some((o) => startIndex(o) === idx && state.men[o].includes(YARD))) score += w.blockOnStart;
  }

  // Single men on the track that someone could land on next turn.
  for (const p of state.men[me]) {
    const idx = trackIndexOf(me, p);
    if (idx === null || (onSquare.get(idx) ?? 0) > 1) continue;
    let risk = 0;
    for (const o of others) {
      const theirP = progressAt(o, idx);
      if (theirP > LAST_TRACK) continue; // the square behind their start is never on their lap
      const out = state.men[o].filter((q) => q !== YARD && q !== HEAVEN).length;
      const canBorn = state.men[o].includes(YARD);
      for (const q of state.men[o]) {
        if (q === YARD && theirP === 0) risk += twoDice ? 11 / 36 : 1 / 6;
        else if (q !== YARD && q <= LAST_TRACK) risk += hitChance(theirP - q, twoDice, out === 1, canBorn);
      }
    }
    score -= w.danger * Math.min(risk, 1) * (worth(p) + 10);
  }
  return score;
}

const play = (s: GameState, m: Move) => applyAction(s, { type: 'move', move: m });

/** Pick the move for the color whose turn it is. `random` only matters for the easy bot and ties. */
export function chooseMove(state: GameState, level: BotLevel, random: () => number = Math.random): Move {
  const moves = legalMoves(state);
  if (moves.length === 0) throw new Error('No legal move to choose');
  if (level === 'easy' || moves.length === 1) return moves[Math.floor(random() * moves.length)]!;

  const me = state.turn.color;
  const w = WEIGHTS[level];
  const score = (m: Move) => {
    const after = play(state, m);
    // Hard plans both dice: judge a move by the best follow-up with the die that's left.
    if (level === 'hard' && after.turn.color === me && after.turn.phase === 'move') {
      const next = legalMoves(after);
      if (next.length > 0) return Math.max(...next.map((n) => evaluate(play(after, n), me, w)));
    }
    return evaluate(after, me, w);
  };

  let best = moves[0]!;
  let bestScore = -Infinity;
  for (const m of moves) {
    const s = score(m) + random() * 0.01; // tiny jitter so equal moves don't always go the same way
    if (s > bestScore) {
      best = m;
      bestScore = s;
    }
  }
  return best;
}
