// The competitive layer: bounties, rivalries, awards and kill taunts. All read from engine state;
// none of it changes the rules.
import { HEAVEN, LAST_TRACK, YARD, statsOf, trackIndexOf, type Color, type GameState, type Move, type Progress } from '../engine';
import { landing } from './turn';

/** A bounty sits on a man this many squares or fewer from turning into his (safe) home lane. */
export const BOUNTY_RANGE = 10;

export interface Bounty {
  color: Color;
  from: Progress;
  /** "first": his first man heading home. "last": his last man out. */
  kind: 'first' | 'last';
}

/**
 * Men worth hunting: a player's first man close to home (before any are in heaven),
 * and a player's last man close to home (with the other three already in heaven).
 * Only while still on the track, where he can be killed.
 */
export function bounties(state: GameState): Bounty[] {
  const out: Bounty[] = [];
  for (const color of state.seats) {
    const men = state.men[color];
    const home = men.filter((p) => p === HEAVEN).length;
    const close = men.filter((p) => p !== YARD && p <= LAST_TRACK && LAST_TRACK - p < BOUNTY_RANGE);
    if (close.length === 0) continue;
    const lead = Math.max(...close);
    if (home === 0) out.push({ color, from: lead, kind: 'first' });
    else if (home === 3) out.push({ color, from: lead, kind: 'last' });
  }
  return out;
}

/** Whether the man on `from` of `color` carries a bounty. */
export const hasBounty = (list: Bounty[], color: Color, from: Progress) => list.some((b) => b.color === color && b.from === from);

/** Legal moves for the current player that would land on (and kill) a bounty man. */
export function bountyKills(state: GameState, legal: Move[]): Move[] {
  const list = bounties(state).filter((b) => b.color !== state.turn.color);
  const me = state.turn.color;
  return legal.filter((m) => {
    const to = landing([m]);
    if (to > LAST_TRACK) return false;
    return list.some((b) => sameSquare(me, to, b.color, b.from));
  });
}

function sameSquare(a: Color, pa: Progress, b: Color, pb: Progress): boolean {
  const ia = trackIndexOf(a, pa);
  return ia !== null && ia === trackIndexOf(b, pb);
}

// ---------------------------------------------------------------------------
// Rivalries

export interface Rivalry {
  /** The opponent this line is about. */
  other: Color;
  /** Kills between them that the line refers to. */
  count: number;
  kind: 'hunted' | 'hunter';
}

/** The sharpest grudge for `me`: who has killed me most (2+), else whom I've killed most (2+). */
export function rivalry(state: GameState, me: Color): Rivalry | null {
  const by = statsOf(state).killsBy;
  const others = state.seats.filter((c) => c !== me);
  const hunted = others.map((o) => ({ other: o, count: by[o]?.[me] ?? 0 })).sort((a, b) => b.count - a.count)[0];
  if (hunted && hunted.count >= 2) return { ...hunted, kind: 'hunted' };
  const hunter = others.map((o) => ({ other: o, count: by[me]?.[o] ?? 0 })).sort((a, b) => b.count - a.count)[0];
  if (hunter && hunter.count >= 2) return { ...hunter, kind: 'hunter' };
  return null;
}

// ---------------------------------------------------------------------------
// Awards

export interface Award {
  id: 'butcher' | 'ghost' | 'unlucky' | 'sixes';
  title: string;
  /** What it's for, with the number. */
  detail: string;
  colors: Color[];
}

/** End-of-game awards. Ties share an award; an award nobody earned is left out. */
export function awards(state: GameState, patois: boolean): Award[] {
  const st = statsOf(state);
  const seats = state.seats;
  const top = (n: Record<Color, number>) => {
    const best = Math.max(...seats.map((c) => n[c]));
    return { best, colors: best > 0 ? seats.filter((c) => n[c] === best) : [] };
  };
  const out: Award[] = [];
  const kills = top(st.kills);
  if (kills.colors.length) {
    out.push({ id: 'butcher', title: patois ? 'Bad Man a di Yard' : 'Butcher', detail: `${kills.best} kill${kills.best > 1 ? 's' : ''}`, colors: kills.colors });
  }
  // Ghost: never killed, among players who actually got men on the board.
  const ghosts = seats.filter((c) => st.killed[c] === 0 && state.men[c].some((p) => p !== YARD));
  if (ghosts.length && ghosts.length < seats.length) {
    out.push({ id: 'ghost', title: patois ? 'Duppy' : 'Ghost', detail: 'never killed', colors: ghosts });
  }
  const killed = top(st.killed);
  if (killed.colors.length) {
    out.push({
      id: 'unlucky',
      title: patois ? 'Bad Luck' : 'Unluckiest',
      detail: `sent home ${killed.best} time${killed.best > 1 ? 's' : ''}`,
      colors: killed.colors,
    });
  }
  const sixes = top(st.sixes);
  if (sixes.colors.length) {
    out.push({ id: 'sixes', title: patois ? 'Six Machine' : 'Most Sixes', detail: `${sixes.best} sixes`, colors: sixes.colors });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Taunts

const TAUNTS = {
  patois: [
    'Gwaan back a yard!',
    'Yuh dead fi true!',
    'Tek dat!',
    'A who seh yuh coulda pass mi?',
    'Yuh shoulda stay a yard!',
    'Yuh cyaan run from mi!',
    'Go home an come back!',
    'Mi nuh ramp wid yuh!',
    'Dat a fi yuh!',
    'Walk good... back a yard!',
    'Yuh run, but yuh cyaan hide!',
    'Seh goodbye!',
  ],
  plain: [
    'Back to the yard you go!',
    'Gotcha!',
    'Take that!',
    'Who said you could pass me?',
    'Should have stayed home!',
    'Nowhere to run!',
    'Start over!',
    'Too slow!',
    'See you at the start!',
    'Better luck next time!',
    'You can run, but you can’t hide!',
    'Say goodbye!',
  ],
};

/** A kill taunt, never the same as the last one shown. */
export function pickTaunt(patois: boolean, last: string | null, random: () => number = Math.random): string {
  const list = TAUNTS[patois ? 'patois' : 'plain'].filter((t) => t !== last);
  return list[Math.floor(random() * list.length)]!;
}

export const TAUNT_LISTS = TAUNTS;
