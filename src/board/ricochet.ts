// The flight of a man smacked off the board: straight lines that bounce off the frame, then home.
import { BOARD_PX, type Point } from './layout';

export interface Leg {
  to: Point;
  /** Share of the whole flight time this leg takes. */
  share: number;
}

/**
 * Bounce a cap from `start` heading along `dir`, reflecting off the inside of the board `bounces`
 * times, then send it to `home`. Each leg after a bounce is slower by `friction`.
 */
export function ricochet(start: Point, dir: Point, bounces: number, home: Point, friction = 0.8, margin = 16): Leg[] {
  const len = Math.hypot(dir.x, dir.y) || 1;
  let d = { x: dir.x / len, y: dir.y / len };
  let p = { ...start };
  const lo = margin;
  const hi = BOARD_PX - margin;
  const raw: { to: Point; dist: number; speed: number }[] = [];
  let speed = 1;
  for (let i = 0; i < bounces; i++) {
    const tx = d.x > 0 ? (hi - p.x) / d.x : d.x < 0 ? (lo - p.x) / d.x : Infinity;
    const ty = d.y > 0 ? (hi - p.y) / d.y : d.y < 0 ? (lo - p.y) / d.y : Infinity;
    const t = Math.max(0, Math.min(tx, ty));
    const next = { x: p.x + d.x * t, y: p.y + d.y * t };
    raw.push({ to: next, dist: t, speed });
    if (tx <= ty) d = { x: -d.x, y: d.y };
    if (ty <= tx) d = { x: d.x, y: -d.y };
    p = next;
    speed *= friction;
  }
  raw.push({ to: home, dist: Math.hypot(home.x - p.x, home.y - p.y), speed });
  const times = raw.map((r) => r.dist / r.speed);
  const total = times.reduce((a, b) => a + b, 0) || 1;
  return raw.map((r, i) => ({ to: r.to, share: times[i]! / total }));
}
