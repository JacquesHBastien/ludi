// A test page for "smack" kill animations (served at /ludi/smack/). Pick a style, watch, replay.
import { useEffect, useRef, useState } from 'react';
import { Board, type Moving } from '../board/Board';
import { CapShape } from '../board/Cap';
import { BOARD_PX, squareCenter, yardSpot, type Point } from '../board/layout';
import { ricochet, type Leg } from '../board/ricochet';
import type { Color, Progress } from '../engine';
import { HIGHLIGHT, getTheme } from '../theme/themes';
import { Screen, SecondaryButton } from '../ui/kit';
import { sfx } from '../ui/sound';
import { DARK_INK, display } from '../ui/style';

type Style = 'pinball' | 'skid' | 'sky' | 'plain';

const STYLES: { id: Style; label: string; about: string }[] = [
  { id: 'pinball', label: 'A · Pinball', about: 'Smacked off fast and straight, cracks off the frame 4 times, drops into its yard.' },
  { id: 'skid', label: 'B · Skid & spin', about: 'Knocked flat and spinning like a flicked bottle cap, two rebounds, slides home.' },
  { id: 'sky', label: 'C · Sky-high', about: 'Launched up at you, crashes down twice, thuds into its yard with a dust ring.' },
  { id: 'plain', label: 'Normal kill', about: "Today's kill, for comparison: the man is just back in his yard." },
];

const theme = getTheme('roots');
const FRAME = 9;
const SEATS: Color[] = ['red', 'gold', 'green', 'black'];
// Red hops 2 onto Keisha's (green) man, who is close to home with a bounty on him.
const RED_FROM: Progress = 11;
const KILL_AT: Progress = 13;
const GREEN_P: Progress = 37;
const BEFORE: Record<Color, Progress[]> = { red: [RED_FROM, -1, -1, -1], gold: [20, -1, -1, -1], green: [GREEN_P, -1, -1, -1], black: [5, 30, -1, -1] };
const DURING: Record<Color, Progress[]> = { ...BEFORE, red: [KILL_AT, -1, -1, -1], green: [NaN, -1, -1, -1] };
const AFTER: Record<Color, Progress[]> = { ...BEFORE, red: [KILL_AT, -1, -1, -1], green: [-1, -1, -1, -1] };

const KILL = squareCenter('red', KILL_AT);
const HOME = yardSpot('green', 0);
const HOP_MS = 160;

interface Fx {
  id: number;
  at: Point;
  kind: 'spark' | 'flash' | 'dust';
}

export default function KillLab() {
  const [style, setStyle] = useState<Style>('pinball');
  const [zoom, setZoom] = useState(true);
  const [men, setMen] = useState(BEFORE);
  const [moving, setMoving] = useState<Moving | undefined>();
  const [zoomedIn, setZoomedIn] = useState(false);
  const [quake, setQuake] = useState(0);
  const [flight, setFlight] = useState<{ id: number; style: Style; legs: Leg[]; duration: number } | null>(null);
  const [fx, setFx] = useState<Fx[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const burst = (at: Point, kind: Fx['kind']) => {
    const id = Math.random();
    setFx((f) => [...f, { id, at, kind }]);
    later(700, () => setFx((f) => f.filter((x) => x.id !== id)));
  };

  function play(which: Style) {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setStyle(which);
    setFlight(null);
    setFx([]);
    setMen(BEFORE);
    const hopId = Date.now();
    if (zoom && which !== 'plain') setZoomedIn(true);
    later(60, () => setMoving({ id: hopId, color: 'red', from: RED_FROM, count: 1, path: [12, 13], stepMs: HOP_MS, onStep: sfx.step }));
    const impact = 60 + 30 + 2 * HOP_MS + 60;

    later(impact, () => {
      setMoving(undefined);
      sfx.kill();
      if (which === 'plain') {
        setMen(AFTER);
        return;
      }
      setMen(DURING);
      setQuake((q) => q + 1);
      burst(KILL, 'flash');
      // The smack carries on the way the attacker was going, knocked a little off line.
      const prev = squareCenter('red', KILL_AT - 1);
      const base = Math.atan2(KILL.y - prev.y, KILL.x - prev.x);
      const angle = base + (Math.random() - 0.5) * 1.1;
      const dir = { x: Math.cos(angle), y: Math.sin(angle) };
      const plan =
        which === 'pinball'
          ? { bounces: 4, friction: 0.85, duration: 1700 }
          : which === 'skid'
            ? { bounces: 2, friction: 0.55, duration: 1800 }
            : { bounces: 2, friction: 0.7, duration: 2100 };
      const legs = ricochet(KILL, dir, plan.bounces, HOME, plan.friction);
      setFlight({ id: Date.now(), style: which, legs, duration: plan.duration });
      if (zoom) later(260, () => setZoomedIn(false));

      // Sounds and sparks on each bounce, a thud on landing.
      let t = 0;
      legs.forEach((leg, i) => {
        t += leg.share * plan.duration;
        const last = i === legs.length - 1;
        later(t, () => {
          if (last) {
            sfx.thud(which === 'sky' ? 1.2 : 0.8);
            burst(HOME, 'dust');
            setMen(AFTER);
            setFlight(null);
            if (which === 'sky') setQuake((q) => q + 1);
          } else if (which === 'sky') {
            sfx.thud(0.9);
            burst(leg.to, 'dust');
          } else {
            sfx.clack(which === 'pinball' ? 1 : 0.7);
            burst(leg.to, 'spark');
          }
        });
      });
    });
  }

  const origin = `${(KILL.x / BOARD_PX) * 100}% ${(KILL.y / BOARD_PX) * 100}%`;
  const current = STYLES.find((s) => s.id === style)!;

  return (
    <Screen theme={theme} padding="14px 12px 24px">
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h1 style={{ ...display(36), margin: 0, fontWeight: 400 }}>Kill lab</h1>
        <a href="../" style={{ color: theme.callout, fontWeight: 800, fontSize: 15 }}>
          Back to the game
        </a>
      </header>
      <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.88, lineHeight: 1.35 }}>
        Auntie Bev (red) smacks Keisha&apos;s man off the board. Tap a style to watch it; tap again to replay.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
        {STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => play(s.id)}
            aria-pressed={s.id === style}
            style={{
              minHeight: 48,
              borderRadius: 10,
              border: `2px solid ${s.id === style ? HIGHLIGHT : theme.trim}`,
              background: s.id === style ? HIGHLIGHT : 'rgba(0,0,0,0.25)',
              color: s.id === style ? DARK_INK : theme.ink,
              fontWeight: 900,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ overflow: 'hidden', borderRadius: 8 }}>
        <div
          key={quake}
          style={{ animation: quake ? 'ludi-quake 0.35s ease-out' : undefined }}
        >
          <div
            style={{
              position: 'relative',
              transformOrigin: origin,
              transform: zoomedIn ? 'scale(2)' : 'scale(1)',
              transition: zoomedIn ? 'transform 0.35s ease-out' : 'transform 0.9s ease-in-out',
            }}
          >
            <Board theme={theme} seats={SEATS} men={men} moving={moving} bounties={men === BEFORE ? [{ color: 'green', from: GREEN_P }] : []} />
            <svg
              viewBox={`0 0 ${BOARD_PX} ${BOARD_PX}`}
              aria-hidden="true"
              style={{ position: 'absolute', inset: FRAME, width: `calc(100% - ${FRAME * 2}px)`, height: `calc(100% - ${FRAME * 2}px)`, overflow: 'visible', pointerEvents: 'none' }}
            >
              {fx.map((f) => (
                <Effect key={f.id} fx={f} />
              ))}
              {flight && <Flyer key={flight.id} {...flight} />}
            </svg>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>{current.about}</div>

      <SecondaryButton trim={theme.trim} height={50} onClick={() => setZoom(!zoom)} style={{ fontSize: 16 }}>
        Zoom in on the kill: {zoom ? 'On' : 'Off'}
      </SecondaryButton>
      <SecondaryButton trim={theme.trim} height={50} onClick={() => play(style)} style={{ fontSize: 16 }}>
        Replay {current.label}
      </SecondaryButton>
    </Screen>
  );
}

/** The smacked man in flight. */
function Flyer({ style, legs, duration }: { style: Style; legs: Leg[]; duration: number }) {
  const cap = useRef<SVGGElement>(null);
  const shadow = useRef<SVGEllipseElement>(null);
  const trail = useRef<SVGPolylineElement>(null);
  const size = 22;

  useEffect(() => {
    // Keyframes: a mid point and an end point per leg, so the sky toss can rise and fall.
    const frames: Keyframe[] = [];
    const ground: Keyframe[] = [];
    let offset = 0;
    let from = KILL;
    let spin = 0;
    const spinRate = style === 'skid' ? 1500 : style === 'sky' ? 900 : 1100; // degrees over the whole flight
    const lift = [2.6, 1.7, 1.3];
    const at = (p: Point, turn: number, scale: number) => `translate(${p.x}px, ${p.y}px) rotate(${turn}deg) scale(${scale})`;
    frames.push({ offset: 0, transform: at(KILL, 0, 1), easing: 'linear' });
    ground.push({ offset: 0, transform: `translate(${KILL.x}px, ${KILL.y}px) scale(1)`, opacity: style === 'sky' ? 0.5 : 0 });
    legs.forEach((leg, i) => {
      const mid = { x: (from.x + leg.to.x) / 2, y: (from.y + leg.to.y) / 2 };
      const midOff = offset + leg.share / 2;
      offset += leg.share;
      const turnMid = spin + spinRate * (leg.share / 2) * (style === 'skid' ? 1.4 - offset : 1);
      spin += spinRate * leg.share * (style === 'skid' ? 1.4 - offset : 1);
      const ease = style === 'skid' ? 'cubic-bezier(.2,.6,.4,1)' : style === 'sky' ? 'ease-in-out' : 'linear';
      frames.push({ offset: midOff, transform: at(mid, turnMid, style === 'sky' ? (lift[i] ?? 1.2) : 1.15), easing: ease });
      frames.push({ offset: Math.min(1, offset), transform: at(leg.to, spin, 1), easing: ease });
      ground.push({ offset: midOff, transform: `translate(${mid.x}px, ${mid.y}px) scale(0.7)`, opacity: style === 'sky' ? 0.25 : 0 });
      ground.push({ offset: Math.min(1, offset), transform: `translate(${leg.to.x}px, ${leg.to.y}px) scale(1)`, opacity: style === 'sky' ? 0.5 : 0 });
      from = leg.to;
    });
    frames[frames.length - 1]!.offset = 1;
    ground[ground.length - 1]!.offset = 1;
    const a = cap.current?.animate(frames, { duration, fill: 'forwards' });
    const b = shadow.current?.animate(ground, { duration, fill: 'forwards' });
    let c: Animation | undefined;
    if (trail.current && style === 'skid') {
      const length = trail.current.getTotalLength?.() ?? 1000;
      trail.current.style.strokeDasharray = `${length}`;
      c = trail.current.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], { duration, fill: 'forwards', easing: 'cubic-bezier(.2,.6,.4,1)' });
    }
    return () => {
      a?.cancel();
      b?.cancel();
      c?.cancel();
    };
    // The flight is fixed for the life of this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const points = [KILL, ...legs.map((l) => l.to)].map((p) => `${p.x},${p.y}`).join(' ');
  return (
    <g>
      {style === 'skid' && (
        <polyline ref={trail} points={points} fill="none" stroke="#000" strokeOpacity={0.3} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      )}
      <ellipse ref={shadow} cx={0} cy={2} rx={size / 2} ry={size / 3} fill="#000" opacity={0} />
      <g ref={cap} style={{ filter: 'drop-shadow(0 3px 2px rgba(0,0,0,0.5))' }}>
        <g transform={`translate(${-size / 2} ${-size / 2}) scale(${size / 20})`}>
          <CapShape color="green" fill={theme.players.green} />
        </g>
      </g>
    </g>
  );
}

function Effect({ fx }: { fx: Fx }) {
  const common = { transformBox: 'fill-box' as const, transformOrigin: 'center' };
  if (fx.kind === 'flash') {
    return (
      <g>
        <circle cx={fx.at.x} cy={fx.at.y} r={14} fill="#FFF3C4" style={{ ...common, animation: 'ludi-burst 0.4s ease-out forwards' }} />
        <circle cx={fx.at.x} cy={fx.at.y} r={18} fill="none" stroke={HIGHLIGHT} strokeWidth={3} style={{ ...common, animation: 'ludi-burst 0.55s ease-out forwards' }} />
      </g>
    );
  }
  if (fx.kind === 'spark') {
    return <circle cx={fx.at.x} cy={fx.at.y} r={7} fill="none" stroke="#FFE08A" strokeWidth={3} style={{ ...common, animation: 'ludi-burst 0.35s ease-out forwards' }} />;
  }
  return <circle cx={fx.at.x} cy={fx.at.y} r={12} fill="none" stroke="#D9C3A0" strokeWidth={4} strokeOpacity={0.8} style={{ ...common, animation: 'ludi-burst 0.6s ease-out forwards' }} />;
}
