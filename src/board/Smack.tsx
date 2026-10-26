// The "smack": on a big kill the victim is knocked off the board, pinballs off the frame and drops
// into his yard. Drawn in board coordinates so it zooms with the board.
import { useEffect, useRef, useState } from 'react';
import type { Color } from '../engine';
import { HIGHLIGHT } from '../theme/themes';
import { CapShape } from './Cap';
import type { Point } from './layout';
import type { Leg } from './ricochet';

export interface SmackShot {
  color: Color;
  fill: string;
  legs: Leg[];
}

export interface Smack {
  /** Changes for every smack so the animation restarts. */
  id: number;
  /** The square where the kill happened. */
  at: Point;
  shots: SmackShot[];
  duration: number;
  /** Called on each bounce off the frame, and when the (last) man lands. */
  onBounce?: () => void;
  onLand?: () => void;
}

interface Fx {
  id: number;
  at: Point;
  kind: 'flash' | 'spark' | 'dust';
}

export function SmackLayer({ smack }: { smack: Smack }) {
  const [fx, setFx] = useState<Fx[]>([{ id: 0, at: smack.at, kind: 'flash' }]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const add = (at: Point, kind: Fx['kind']) => {
      const id = Math.random();
      setFx((f) => [...f, { id, at, kind }]);
      timers.push(setTimeout(() => setFx((f) => f.filter((x) => x.id !== id)), 700));
    };
    // Sparks and clicks on the first man's bounces; dust where each man lands.
    smack.shots.forEach((shot, s) => {
      let t = 0;
      shot.legs.forEach((leg, i) => {
        t += leg.share * smack.duration;
        const last = i === shot.legs.length - 1;
        timers.push(
          setTimeout(() => {
            add(leg.to, last ? 'dust' : 'spark');
            if (s === 0 && !last) smack.onBounce?.();
            if (s === 0 && last) smack.onLand?.();
          }, t),
        );
      });
    });
    return () => timers.forEach(clearTimeout);
    // One smack per id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smack.id]);

  return (
    <g aria-hidden="true" style={{ pointerEvents: 'none' }}>
      {fx.map((f) => (
        <Effect key={f.id} fx={f} />
      ))}
      {smack.shots.map((shot, i) => (
        <Flyer key={`${smack.id}-${i}`} start={smack.at} shot={shot} duration={smack.duration} />
      ))}
    </g>
  );
}

/** One man flying: straight legs between bounces, spinning, slightly lifted in the air. */
function Flyer({ start, shot, duration }: { start: Point; shot: SmackShot; duration: number }) {
  const ref = useRef<SVGGElement>(null);
  const size = 22;

  useEffect(() => {
    const at = (p: Point, turn: number, scale: number) => `translate(${p.x}px, ${p.y}px) rotate(${turn}deg) scale(${scale})`;
    const frames: Keyframe[] = [{ offset: 0, transform: at(start, 0, 1), easing: 'linear' }];
    let offset = 0;
    let from = start;
    for (const leg of shot.legs) {
      const mid = { x: (from.x + leg.to.x) / 2, y: (from.y + leg.to.y) / 2 };
      frames.push({ offset: offset + leg.share / 2, transform: at(mid, (offset + leg.share / 2) * 1100, 1.15), easing: 'linear' });
      offset += leg.share;
      frames.push({ offset: Math.min(1, offset), transform: at(leg.to, offset * 1100, 1), easing: 'linear' });
      from = leg.to;
    }
    frames[frames.length - 1]!.offset = 1;
    const anim = ref.current?.animate(frames, { duration, fill: 'forwards' });
    return () => anim?.cancel();
    // The flight is fixed for the life of this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <g ref={ref} style={{ filter: 'drop-shadow(0 3px 2px rgba(0,0,0,0.5))' }}>
      <g transform={`translate(${-size / 2} ${-size / 2}) scale(${size / 20})`}>
        <CapShape color={shot.color} fill={shot.fill} />
      </g>
    </g>
  );
}

function Effect({ fx }: { fx: Fx }) {
  const grow = { transformBox: 'fill-box' as const, transformOrigin: 'center' };
  if (fx.kind === 'flash') {
    return (
      <g>
        <circle cx={fx.at.x} cy={fx.at.y} r={14} fill="#FFF3C4" style={{ ...grow, animation: 'ludi-burst 0.4s ease-out forwards' }} />
        <circle cx={fx.at.x} cy={fx.at.y} r={18} fill="none" stroke={HIGHLIGHT} strokeWidth={3} style={{ ...grow, animation: 'ludi-burst 0.55s ease-out forwards' }} />
      </g>
    );
  }
  if (fx.kind === 'spark') {
    return <circle cx={fx.at.x} cy={fx.at.y} r={7} fill="none" stroke="#FFE08A" strokeWidth={3} style={{ ...grow, animation: 'ludi-burst 0.35s ease-out forwards' }} />;
  }
  return <circle cx={fx.at.x} cy={fx.at.y} r={12} fill="none" stroke="#D9C3A0" strokeWidth={4} strokeOpacity={0.8} style={{ ...grow, animation: 'ludi-burst 0.6s ease-out forwards' }} />;
}
