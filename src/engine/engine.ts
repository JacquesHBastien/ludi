import { COLORS, HEAVEN, LAST_TRACK, MEN_PER_COLOR, START, YARD, isOnTrack, trackIndexOf } from './board';
import type { Action, Color, GameEvent, GameSetup, GameState, GameStats, Move, Progress, Rules } from './types';

export const DEFAULT_RULES: Rules = { diceMode: 'two', heavenless: false };

type Men = Record<Color, Progress[]>;

/** The parts of the state that decide which moves are legal. */
interface Board {
  men: Men;
  seats: Color[];
  rules: Rules;
  /** Men that killed earlier this roll and can't move again yet. */
  stuck?: { from: Progress; count: number };
}

interface Resolution {
  to: Progress;
  movers: number;
  victims: { color: Color; count: number; trackIndex: number }[];
}

// ---------------------------------------------------------------------------
// Setup

export function createGame(setup: GameSetup): GameState {
  const rules = { ...DEFAULT_RULES, ...setup.rules };
  const { players } = setup;
  const owned = players.map((p) => p.color);

  if (players.length < 2 || players.length > 4) throw new Error('Ludi needs 2 to 4 players');
  if (new Set(owned).size !== owned.length) throw new Error('Two players picked the same color');
  if (new Set(players.map((p) => p.id)).size !== players.length) throw new Error('Player ids must be unique');
  if (players.length === 2 && !isDiagonal(owned[0]!, owned[1]!)) {
    throw new Error('Two players sit diagonally: red with green, or gold with black');
  }

  const seats = COLORS.filter((c) => owned.includes(c));
  const men = Object.fromEntries(
    COLORS.map((c) => [c, seats.includes(c) ? Array<Progress>(MEN_PER_COLOR).fill(YARD) : []]),
  ) as Men;

  const first = setup.firstColor ? seats.indexOf(setup.firstColor) : 0;
  if (first < 0) throw new Error(`${setup.firstColor} is not in this game`);

  return {
    version: 2,
    rules,
    players: players.map((p) => ({ ...p })),
    seats,
    men,
    turn: { seat: first, color: seats[first]!, phase: 'roll', dice: [], rolled: [], extraRoll: false },
    placements: [],
    status: 'playing',
    result: null,
    stats: emptyStats(),
    events: [],
  };
}

// ---------------------------------------------------------------------------
// Queries

/** Every move the current color may make right now. Empty unless it is the move phase. */
export function legalMoves(state: GameState): Move[] {
  if (state.status !== 'playing' || state.turn.phase !== 'move') return [];
  return movesForDice({ ...state, stuck: state.turn.stuck }, state.turn.color, state.turn.dice);
}

/** All blocks on the main track (two or more men of one color on a square). */
export function blocks(state: GameState): { color: Color; trackIndex: number; count: number }[] {
  const out: { color: Color; trackIndex: number; count: number }[] = [];
  for (const color of state.seats) {
    const counts = new Map<number, number>();
    for (const p of state.men[color]) {
      const idx = trackIndexOf(color, p);
      if (idx !== null) counts.set(idx, (counts.get(idx) ?? 0) + 1);
    }
    for (const [trackIndex, count] of counts) if (count >= 2) out.push({ color, trackIndex, count });
  }
  return out;
}

export function ownerOf(state: GameState, color: Color): string {
  return state.players.find((p) => p.color === color)!.id;
}

/** Opposite corners of the board: red/green and gold/black. */
export function isDiagonal(a: Color, b: Color): boolean {
  return Math.abs(COLORS.indexOf(a) - COLORS.indexOf(b)) === COLORS.length / 2;
}

export function sameMove(a: Move, b: Move): boolean {
  return a.kind === b.kind && a.from === b.from && a.die === b.die;
}

// ---------------------------------------------------------------------------
// Actions

export function applyAction(state: GameState, action: Action): GameState {
  if (state.status !== 'playing') throw new Error('The game is over');
  return action.type === 'roll' ? roll(state, action.dice) : move(state, action.move);
}

function roll(state: GameState, dice: number[]): GameState {
  const { turn, rules } = state;
  if (turn.phase !== 'roll') throw new Error('Use your dice before rolling again');
  const want = rules.diceMode === 'two' ? 2 : 1;
  if (dice.length !== want) throw new Error(`Expected ${want} dice, got ${dice.length}`);
  if (dice.some((d) => !Number.isInteger(d) || d < 1 || d > 6)) throw new Error('Dice must be 1 to 6');

  const stats = statsOf(state);
  const next: GameState = {
    ...state,
    turn: { ...turn, phase: 'move', dice: [...dice], rolled: [...dice], extraRoll: dice.includes(6), stuck: undefined },
    events: [{ type: 'rolled', color: turn.color, dice: [...dice] }],
    stats: {
      ...stats,
      sixes: { ...stats.sixes, [turn.color]: stats.sixes[turn.color] + dice.filter((d) => d === 6).length },
      dice: { ...stats.dice, [turn.color]: stats.dice[turn.color] + dice.length },
    },
  };
  if (legalMoves(next).length > 0) return next;
  next.events.push({ type: 'noMoves', color: turn.color });
  return finishDice(next);
}

function move(state: GameState, m: Move): GameState {
  if (state.turn.phase !== 'move') throw new Error('Roll first');
  if (!legalMoves(state).some((l) => sameMove(l, m))) throw new Error(`Illegal move ${JSON.stringify(m)}`);

  const { color } = state.turn;
  const res = resolve(state, color, m)!;
  const { men, events } = moveMen(state, color, m, res);
  let next: GameState = {
    ...state,
    men,
    // A man who kills stops there: he can't take the other die this roll.
    turn: {
      ...state.turn,
      dice: spendDice(state.turn.dice, m),
      stuck: res.victims.length > 0 ? { from: res.to, count: res.movers } : state.turn.stuck,
    },
    events,
    stats: countKills(statsOf(state), events),
  };

  next = checkGameEnd(next);
  if (next.status === 'over') return next;
  if (next.men[color].every((p) => p === HEAVEN)) return advance(next);
  if (next.turn.dice.length > 0 && legalMoves(next).length > 0) return next;
  return finishDice(next);
}

// ---------------------------------------------------------------------------
// Turn flow

/** The dice are spent (or unusable). Roll again on a 6, else pass to the next color. */
function finishDice(state: GameState): GameState {
  if (state.turn.extraRoll) {
    return { ...state, turn: { ...state.turn, phase: 'roll', dice: [], rolled: [], extraRoll: false, stuck: undefined } };
  }
  return advance(state);
}

function advance(state: GameState): GameState {
  const { seats } = state;
  let seat = state.turn.seat;
  for (let i = 0; i < seats.length; i++) {
    seat = (seat + 1) % seats.length;
    if (!state.men[seats[seat]!].every((p) => p === HEAVEN)) break;
  }
  return {
    ...state,
    turn: { seat, color: seats[seat]!, phase: 'roll', dice: [], rolled: [], extraRoll: false },
  };
}

function checkGameEnd(state: GameState): GameState {
  const inHeaven = (color: Color) => state.men[color].filter((p) => p === HEAVEN).length;
  const events = [...state.events];

  if (state.rules.heavenless && state.placements.length === 0 && state.players.every((p) => inHeaven(p.color) > 0)) {
    const result = { kind: 'draw' } as const;
    events.push({ type: 'gameOver', result });
    return { ...state, status: 'over', result, events };
  }

  const placements = [...state.placements];
  for (const p of state.players) {
    if (!placements.includes(p.id) && inHeaven(p.color) === MEN_PER_COLOR) {
      placements.push(p.id);
      events.push({ type: 'finished', playerId: p.id, place: placements.length });
    }
  }
  const left = state.players.filter((p) => !placements.includes(p.id));
  if (left.length <= 1) {
    placements.push(...left.map((p) => p.id));
    const result = { kind: 'placed', placements } as const;
    events.push({ type: 'gameOver', result });
    return { ...state, placements, status: 'over', result, events };
  }
  return { ...state, placements, events };
}

// ---------------------------------------------------------------------------
// Move rules

/**
 * Two-dice rules on top of the raw moves:
 * - If any sequence uses both dice, only moves that start such a sequence are legal.
 * - If only one die can be used, it must be the bigger one when the bigger one can move.
 */
function movesForDice(board: Board, color: Color, dice: number[]): Move[] {
  const moves = rawMoves(board, color, dice);
  if (dice.length < 2) return moves;

  const usesBoth = moves.filter((m) => {
    if (m.kind === 'pair') return true;
    const rest = spendDice(dice, m);
    const res = resolve(board, color, m)!;
    const after: Board = {
      ...board,
      men: moveMen(board, color, m, res).men,
      stuck: res.victims.length > 0 ? { from: res.to, count: res.movers } : board.stuck,
    };
    return rawMoves(after, color, rest).length > 0;
  });
  if (usesBoth.length > 0) return usesBoth;

  const big = Math.max(...dice);
  const withBig = moves.filter((m) => m.die === big);
  return withBig.length > 0 ? withBig : moves;
}

function rawMoves(board: Board, color: Color, dice: number[]): Move[] {
  const froms = [...new Set(board.men[color].filter((p) => p !== HEAVEN))];
  const out: Move[] = [];
  for (const die of new Set(dice)) {
    for (const from of froms) {
      const m: Move = { kind: 'single', from, die };
      if (resolve(board, color, m)) out.push(m);
    }
  }
  if (board.rules.diceMode === 'two' && dice.length === 2 && dice[0] === dice[1]) {
    for (const from of froms) {
      const m: Move = { kind: 'pair', from, die: dice[0]! };
      if (resolve(board, color, m)) out.push(m);
    }
  }
  return out;
}

/** Where a move lands and who it kills, or null if it is not allowed. Ignores which dice are left. */
function resolve(board: Board, color: Color, m: Move): Resolution | null {
  const movers = m.kind === 'pair' ? 2 : 1;
  if (m.kind === 'pair' && board.rules.diceMode !== 'two') return null;
  const stuckHere = board.stuck?.from === m.from ? board.stuck.count : 0;
  if (m.from === HEAVEN || countAt(board.men[color], m.from) - stuckHere < movers) return null;

  let to: Progress;
  if (m.from === YARD) {
    if (m.die !== 6) return null;
    to = START;
  } else {
    to = m.from + m.die;
    if (to > HEAVEN) return null; // exact count into heaven
    // Nobody passes another color's block.
    for (let p = m.from + 1; p < to && p <= LAST_TRACK; p++) {
      if (opponentsAt(board, color, trackIndexOf(color, p)!).some((o) => o.count >= 2)) return null;
    }
  }

  const victims: Resolution['victims'] = [];
  if (isOnTrack(to)) {
    for (const o of opponentsAt(board, color, trackIndexOf(color, to)!)) {
      // Only a block can land on (and kill) a block.
      if (o.count >= 2 && movers < 2) return null;
      victims.push(o);
    }
  }
  return { to, movers, victims };
}

function moveMen(board: Board, color: Color, m: Move, res: Resolution): { men: Men; events: GameEvent[] } {
  const men = Object.fromEntries(COLORS.map((c) => [c, [...board.men[c]]])) as Men;
  const events: GameEvent[] = [];
  const mine = men[color];
  const alreadyThere = isOnTrack(res.to) ? countAt(mine, res.to) : 0;

  let moved = 0;
  for (let i = 0; i < mine.length && moved < res.movers; i++) {
    if (mine[i] === m.from) {
      mine[i] = res.to;
      moved++;
    }
  }

  for (const v of res.victims) {
    men[v.color] = men[v.color].map((p) => (trackIndexOf(v.color, p) === v.trackIndex ? YARD : p));
    events.push({ type: 'kill', color, victim: v.color, count: v.count, trackIndex: v.trackIndex });
  }
  if (m.from === YARD) events.push({ type: 'born', color, count: res.movers });
  if (res.to === HEAVEN) events.push({ type: 'heaven', color, count: res.movers });
  if (isOnTrack(res.to) && (alreadyThere > 0 || (m.from === YARD && res.movers > 1))) {
    events.push({ type: 'block', color, trackIndex: trackIndexOf(color, res.to)!, count: alreadyThere + res.movers });
  }
  return { men, events };
}

function opponentsAt(board: Board, color: Color, trackIndex: number): Resolution['victims'] {
  const out: Resolution['victims'] = [];
  for (const c of board.seats) {
    if (c === color) continue;
    const count = board.men[c].filter((p) => trackIndexOf(c, p) === trackIndex).length;
    if (count > 0) out.push({ color: c, count, trackIndex });
  }
  return out;
}

function countAt(list: Progress[], p: Progress): number {
  return list.filter((x) => x === p).length;
}

function spendDice(dice: number[], m: Move): number[] {
  if (m.kind === 'pair') return [];
  const rest = [...dice];
  rest.splice(rest.indexOf(m.die), 1);
  return rest;
}

// ---------------------------------------------------------------------------
// Stats

function emptyStats(): GameStats {
  const zero = () => Object.fromEntries(COLORS.map((c) => [c, 0])) as Record<Color, number>;
  return {
    kills: zero(),
    killed: zero(),
    killsBy: Object.fromEntries(COLORS.map((c) => [c, {}])) as GameStats['killsBy'],
    lastKiller: {},
    sixes: zero(),
    dice: zero(),
  };
}

/** Stats for a state, filling them in for games saved before stats existed. */
export function statsOf(state: GameState): GameStats {
  return state.stats ?? emptyStats();
}

function countKills(stats: GameStats, events: GameEvent[]): GameStats {
  let out = stats;
  for (const e of events) {
    if (e.type !== 'kill') continue;
    // The victim now owes the killer; if the killer was owed by the victim, that debt is paid.
    const owed = { ...out.lastKiller, [e.victim]: e.color };
    if (owed[e.color] === e.victim) delete owed[e.color];
    out = {
      ...out,
      lastKiller: owed,
      kills: { ...out.kills, [e.color]: out.kills[e.color] + e.count },
      killed: { ...out.killed, [e.victim]: out.killed[e.victim] + e.count },
      killsBy: { ...out.killsBy, [e.color]: { ...out.killsBy[e.color], [e.victim]: (out.killsBy[e.color][e.victim] ?? 0) + e.count } },
    };
  }
  return out;
}

/** True if `killer` killing `victim` pays back the last time victim killed one of killer's men. */
export function isRevenge(stats: GameStats, killer: Color, victim: Color): boolean {
  return stats.lastKiller?.[killer] === victim;
}
