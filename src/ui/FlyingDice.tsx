import { useEffect, useRef, useState } from 'react';
import { Die } from './Dice';

export interface Flight {
  /** Final faces, shown as the dice settle back in the tray. */
  values: number[];
  /** The tray and board on screen when the roll started. */
  tray: DOMRect;
  board: DOMRect;
  duration: number;
  /** How hard the throw is: about 0.3 (a lob) to 1.5 (a slam). 1 is the normal roll. */
  power?: number;
  /** Which way it's thrown: -1 left, 0 straight, 1 right. */
  aim?: number;
}

const DIE = 54;
const GAP = 10;
const PAD = 8;

/** Where die `i` sits in the tray, matching the DiceTray layout. */
function slot(tray: DOMRect, i: number) {
  return { x: tray.left + PAD + i * (DIE + GAP), y: tray.top + PAD };
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** The dice leave the tray, tumble and bounce across the board, then land back in their slots. */
export function FlyingDice({ flight }: { flight: Flight }) {
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
      {flight.values.map((v, i) => (
        <FlyingDie key={i} index={i} value={v} flight={flight} />
      ))}
    </div>
  );
}

function FlyingDie({ index, value, flight }: { index: number; value: number; flight: Flight }) {
  const el = useRef<HTMLDivElement>(null);
  const [face, setFace] = useState(1 + ((index * 3) % 6));
  const { tray, board, duration, power = 1, aim = 0 } = flight;
  const home = slot(tray, index);

  useEffect(() => {
    // A path over the board: up and out, a hard bounce, a smaller one, then roll home.
    const clamp = (v: number) => Math.min(0.95, Math.max(0.05, v));
    const point = (fx: number, fy: number) => ({
      x: board.left + board.width * clamp(fx) - DIE / 2 - home.x,
      y: board.top + board.height * clamp(fy) - DIE / 2 - home.y,
    });
    // A harder throw flies higher up the board, spreads wider and spins more; aim pushes it sideways.
    const side = index === 0 ? -1 : 1;
    const spread = 0.6 + 0.4 * power;
    const lean = aim * 0.28 * power;
    const peak = 0.62 - 0.36 * power;
    const p1 = point(0.5 + lean + side * rand(0.05, 0.2) * spread, peak + rand(-0.06, 0.06));
    const p2 = point(0.5 + lean * 1.2 + side * rand(0.15, 0.32) * spread, peak + 0.27 + rand(-0.04, 0.04));
    const p3 = point(0.5 + lean * 0.8 + side * rand(0.1, 0.25) * spread, peak + 0.42 + rand(-0.04, 0.04));
    const p4 = point(0.5 + lean * 0.4 + side * rand(0.05, 0.18) * spread, rand(0.86, 0.96));
    // Whole turns overall, so the die always lands square in its slot.
    const turns = Math.max(2, Math.round(4 * (0.6 + 0.5 * power)));
    const spin = ((index === 0 ? -1 : 1) * 360 * turns) / 4;
    const lift = 1 + 0.35 * power;
    const at = (p: { x: number; y: number }, turns: number, scale: number) =>
      `translate(${p.x}px, ${p.y}px) rotate(${turns * spin}deg) scale(${scale})`;

    const anim = el.current?.animate(
      [
        { offset: 0, transform: at({ x: 0, y: 0 }, 0, 1), easing: 'cubic-bezier(.2,.7,.4,1)' },
        { offset: 0.28, transform: at(p1, 1.2, lift), easing: 'cubic-bezier(.5,0,.9,.6)' },
        { offset: 0.46, transform: at(p2, 2, 1.05), easing: 'cubic-bezier(.2,.7,.4,1)' },
        { offset: 0.6, transform: at(p3, 2.6, 1 + 0.15 * power), easing: 'cubic-bezier(.5,0,.9,.6)' },
        { offset: 0.72, transform: at(p4, 3, 1.05), easing: 'ease-out' },
        { offset: 1, transform: at({ x: 0, y: 0 }, 4, 1) },
      ],
      { duration, fill: 'forwards' },
    );

    // Faces flicker while the die is spinning and settle on the real number for the last stretch.
    const flicker = setInterval(() => setFace((f) => 1 + ((f + 1 + Math.floor(Math.random() * 4)) % 6)), 90);
    const settle = setTimeout(() => {
      clearInterval(flicker);
      setFace(value);
    }, duration * 0.74);
    return () => {
      anim?.cancel();
      clearInterval(flicker);
      clearTimeout(settle);
    };
    // The flight is fixed for the life of this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={el}
      style={{
        position: 'absolute',
        left: home.x,
        top: home.y,
        width: DIE,
        height: DIE,
        filter: 'drop-shadow(0 8px 6px rgba(0,0,0,0.45))',
        willChange: 'transform',
      }}
    >
      <Die value={face} />
    </div>
  );
}
