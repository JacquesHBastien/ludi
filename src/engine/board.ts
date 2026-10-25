import geometry from '../../design/board-geometry.json';
import type { Color, Progress } from './types';

export const COLORS = geometry.turnOrder as Color[];
export const TRACK_LENGTH = geometry.trackLength;
export const LANE_LENGTH = geometry.players.red.homeLane.length;
export const MEN_PER_COLOR = 4;

export const YARD: Progress = -1;
export const START: Progress = 0;

const stepsToLastTrack = (c: Color) =>
  (geometry.players[c].lastTrackIndex - geometry.players[c].startIndex + TRACK_LENGTH) % TRACK_LENGTH;

/**
 * His long crossing bar: the last square where he can be killed.
 * A man is born one square into his arm, so the square behind his start is never his.
 */
export const LAST_TRACK: Progress = stepsToLastTrack('red');
for (const c of COLORS) {
  if (stepsToLastTrack(c) !== LAST_TRACK) throw new Error(`board-geometry.json: ${c} has a different lap length`);
}
/** First home-lane bar. */
export const LANE_START: Progress = LAST_TRACK + 1;
/** Five lane bars after the last track square, then heaven. */
export const HEAVEN: Progress = LANE_START + LANE_LENGTH;

export function startIndex(color: Color): number {
  return geometry.players[color].startIndex;
}

export function lastTrackIndex(color: Color): number {
  return geometry.players[color].lastTrackIndex;
}

export function isOnTrack(p: Progress): boolean {
  return p >= START && p <= LAST_TRACK;
}

export function isInLane(p: Progress): boolean {
  return p > LAST_TRACK && p < HEAVEN;
}

/** The shared track index (0..47) for a man's progress, or null if he is not on the track. */
export function trackIndexOf(color: Color, p: Progress): number | null {
  return isOnTrack(p) ? (startIndex(color) + p) % TRACK_LENGTH : null;
}

/** The progress a man of `color` has when standing on `trackIndex` (meaningless for the square behind his start). */
export function progressAt(color: Color, trackIndex: number): Progress {
  return (trackIndex - startIndex(color) + TRACK_LENGTH) % TRACK_LENGTH;
}

export type Location =
  | { kind: 'yard' }
  | { kind: 'track'; index: number }
  | { kind: 'lane'; step: number }
  | { kind: 'heaven' };

/** Where to draw a man. `lane.step` indexes the color's `homeLane` rects in board-geometry.json. */
export function locationOf(color: Color, p: Progress): Location {
  if (p === YARD) return { kind: 'yard' };
  if (p === HEAVEN) return { kind: 'heaven' };
  if (isInLane(p)) return { kind: 'lane', step: p - LANE_START };
  return { kind: 'track', index: trackIndexOf(color, p)! };
}
