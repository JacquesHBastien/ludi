// A test page for different ways to throw the dice (served at /ludi/dice/).
// The result is always the same fair random roll; only how the throw feels changes.
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Board } from '../board/Board';
import type { Color, Progress } from '../engine';
import { getTheme, HIGHLIGHT } from '../theme/themes';
import { Die } from '../ui/Dice';
import { FlyingDice, type Flight } from '../ui/FlyingDice';
import { Screen, SecondaryButton } from '../ui/kit';
import { rollDice } from '../ui/random';
import { sfx } from '../ui/sound';
import { DARK_INK, display } from '../ui/style';

type Mode = 'tap' | 'hold' | 'flick' | 'shake';

const MODES: { id: Mode; label: string; how: string }[] = [
  { id: 'tap', label: 'Tap', how: 'Tap the dice. This is how the game rolls today.' },
  { id: 'hold', label: 'Hold & shake', how: 'Press and hold the dice to shake them. Let go to throw. Hold longer for a harder throw.' },
  { id: 'flick', label: 'Flick', how: 'Put your finger on the dice and flick up. Flick faster to throw harder; flick left or right to aim.' },
  { id: 'shake', label: 'Shake phone', how: 'Shake your phone like a cup, then stop. The dice fly when you stop.' },
];

const theme = getTheme('roots');
const MEN: Record<Color, Progress[]> = { red: [4, 4, 20, -1], gold: [9, -1, -1, -1], green: [30, -1, -1, -1], black: [14, 40, -1, -1] };
const SEATS: Color[] = ['red', 'gold', 'green', 'black'];

const buzz = (ms: number | number[]) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // not supported (iPhone): silent
  }
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Keep getting the finger's moves even if it slides off the dice; harmless if the browser says no. */
const capture = (e: ReactPointerEvent) => {
  try {
    e.currentTarget.setPointerCapture(e.pointerId);
  } catch {
    // ignore
  }
};

export default function DiceLab() {
  const [mode, setMode] = useState<Mode>('hold');
  const [dice, setDice] = useState<number[]>([6, 6]);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [power, setPower] = useState(0);
  const [last, setLast] = useState<string>('');
  const [shaking, setShaking] = useState(false);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [motion, setMotion] = useState<'off' | 'on' | 'unsupported' | 'denied'>('off');
  const trayRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const hold = useRef<{ start: number; timer: ReturnType<typeof setInterval> } | null>(null);
  const flick = useRef<{ x: number; y: number; t: number; pts: { y: number; t: number }[] } | null>(null);

  const busy = flight !== null;

  function throwDice(p: number, aim = 0, how = '') {
    if (busy || !trayRef.current || !boardRef.current) return;
    const values = rollDice('two');
    const duration = clamp(1000 + 850 * p, 1000, 2400);
    sfx.roll(duration / 1000);
    buzz(30);
    setFlight({
      values,
      tray: trayRef.current.getBoundingClientRect(),
      board: boardRef.current.getBoundingClientRect(),
      duration,
      power: p,
      aim,
    });
    setTimeout(() => {
      setFlight(null);
      setDice(values);
      setPower(0);
      setLast(`${values[0]} + ${values[1]} · ${how}${Math.round((p / 1.5) * 100)}% power`);
      buzz([12, 40, 12]);
    }, duration);
  }

  // --- Hold & shake --------------------------------------------------------------------------
  const startHold = (e: ReactPointerEvent) => {
    if (busy) return;
    capture(e);
    const start = performance.now();
    setShaking(true);
    const timer = setInterval(() => {
      const p = clamp(0.3 + (performance.now() - start) / 1100, 0.3, 1.5);
      setPower(p);
      sfx.shake(p);
      buzz(10 + Math.round(p * 12));
    }, 120);
    hold.current = { start, timer };
  };
  const endHold = () => {
    if (!hold.current) return;
    clearInterval(hold.current.timer);
    const p = clamp(0.3 + (performance.now() - hold.current.start) / 1100, 0.3, 1.5);
    hold.current = null;
    setShaking(false);
    throwDice(p, 0, 'held · ');
  };

  // --- Flick ---------------------------------------------------------------------------------
  const startFlick = (e: ReactPointerEvent) => {
    if (busy) return;
    capture(e);
    flick.current = { x: e.clientX, y: e.clientY, t: performance.now(), pts: [{ y: e.clientY, t: performance.now() }] };
  };
  const moveFlick = (e: ReactPointerEvent) => {
    const f = flick.current;
    if (!f) return;
    f.pts.push({ y: e.clientY, t: performance.now() });
    if (f.pts.length > 6) f.pts.shift();
    setDrag({ x: (e.clientX - f.x) * 0.5, y: Math.min(0, e.clientY - f.y) * 0.6 });
    setPower(clamp((f.y - e.clientY) / 160, 0, 1.5));
  };
  const endFlick = (e: ReactPointerEvent) => {
    const f = flick.current;
    flick.current = null;
    setDrag({ x: 0, y: 0 });
    if (!f) return;
    const first = f.pts[0]!;
    const speed = (first.y - e.clientY) / Math.max(16, performance.now() - first.t); // px per ms, up is positive
    const up = f.y - e.clientY;
    if (up < 30 || speed < 0.25) {
      setPower(0);
      setLast('Flick upward to throw!');
      return;
    }
    throwDice(clamp(speed / 1.4, 0.3, 1.5), clamp((e.clientX - f.x) / 110, -1, 1), 'flicked · ');
  };

  // --- Shake the phone -----------------------------------------------------------------------
  const motionState = useRef({ energy: 0, lastShake: 0, active: false });
  useEffect(() => {
    if (mode !== 'shake' || motion !== 'on') return;
    const onMotion = (ev: DeviceMotionEvent) => {
      const a = ev.acceleration ?? ev.accelerationIncludingGravity;
      if (!a) return;
      const g = ev.acceleration ? 0 : 9.8;
      const mag = Math.abs(Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0) - g);
      const st = motionState.current;
      const now = performance.now();
      if (mag > 12) {
        st.energy += mag;
        if (now - st.lastShake > 90) {
          sfx.shake(clamp(st.energy / 600, 0.3, 1.5));
          setPower(clamp(st.energy / 600, 0, 1.5));
        }
        st.lastShake = now;
        st.active = true;
        setShaking(true);
      }
    };
    // When the shaking stops for a moment, throw.
    const check = setInterval(() => {
      const st = motionState.current;
      if (st.active && performance.now() - st.lastShake > 350) {
        const p = clamp(st.energy / 600, 0.3, 1.5);
        st.active = false;
        st.energy = 0;
        setShaking(false);
        throwDice(p, 0, 'shaken · ');
      }
    }, 100);
    window.addEventListener('devicemotion', onMotion);
    return () => {
      window.removeEventListener('devicemotion', onMotion);
      clearInterval(check);
    };
    // throwDice is recreated each render; listening is tied to the mode and permission only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, motion]);

  async function enableMotion() {
    const DM = (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent;
    if (!DM) return setMotion('unsupported');
    try {
      if (DM.requestPermission) {
        const answer = await DM.requestPermission();
        return setMotion(answer === 'granted' ? 'on' : 'denied');
      }
      setMotion('on');
    } catch {
      setMotion('denied');
    }
  }

  const current = MODES.find((m) => m.id === mode)!;
  const trayHandlers =
    mode === 'tap'
      ? { onClick: () => throwDice(1, 0, '') }
      : mode === 'hold'
        ? { onPointerDown: startHold, onPointerUp: endHold, onPointerCancel: endHold }
        : mode === 'flick'
          ? { onPointerDown: startFlick, onPointerMove: moveFlick, onPointerUp: endFlick, onPointerCancel: endFlick }
          : {};

  return (
    <Screen theme={theme} padding="14px 12px 24px">
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h1 style={{ ...display(36), margin: 0, fontWeight: 400 }}>Dice lab</h1>
        <a href="../" style={{ color: theme.callout, fontWeight: 800, fontSize: 15 }}>
          Back to the game
        </a>
      </header>
      <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.88, lineHeight: 1.35 }}>
        Try each way of throwing. The numbers are always a fair random roll; only the feel changes.
      </div>

      <div role="tablist" aria-label="Throw style" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
        {MODES.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={m.id === mode}
            onClick={() => {
              setMode(m.id);
              setLast('');
              setPower(0);
            }}
            style={{
              minHeight: 48,
              padding: '4px 4px',
              borderRadius: 10,
              border: `2px solid ${m.id === mode ? HIGHLIGHT : theme.trim}`,
              background: m.id === mode ? HIGHLIGHT : 'rgba(0,0,0,0.25)',
              color: m.id === mode ? DARK_INK : theme.ink,
              fontWeight: 900,
              fontSize: 13,
              lineHeight: 1.1,
              cursor: 'pointer',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div ref={boardRef}>
        <Board theme={theme} seats={SEATS} men={MEN} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35, flex: 1 }}>{current.how}</div>
        <div
          ref={trayRef}
          role="button"
          aria-label="Dice"
          {...trayHandlers}
          style={{
            display: 'flex',
            gap: 10,
            padding: 8,
            borderRadius: 14,
            backgroundColor: theme.frame,
            boxShadow: `inset 0 3px 6px rgba(0,0,0,0.5), 0 0 0 2px ${busy ? 'transparent' : HIGHLIGHT}`,
            flexShrink: 0,
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            cursor: busy || mode === 'shake' ? 'default' : 'pointer',
          }}
        >
          {dice.map((v, i) => (
            <div
              key={i}
              style={{
                visibility: busy ? 'hidden' : 'visible',
                transform: `translate(${drag.x}px, ${drag.y}px)`,
                animation: shaking ? `ludi-shake ${Math.max(0.08, 0.22 - power * 0.09)}s linear infinite` : undefined,
              }}
            >
              <Die value={v} />
            </div>
          ))}
        </div>
      </div>

      {(mode === 'hold' || mode === 'flick' || mode === 'shake') && (
        <div aria-label="Throw power" style={{ height: 12, borderRadius: 6, background: 'rgba(0,0,0,0.35)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${(power / 1.5) * 100}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${theme.players.green}, ${HIGHLIGHT}, ${theme.players.red})`,
              transition: 'width 0.1s linear',
            }}
          />
        </div>
      )}

      {mode === 'shake' && motion !== 'on' && (
        <SecondaryButton trim={theme.trim} height={52} onClick={enableMotion}>
          {motion === 'off'
            ? 'Turn on shaking'
            : motion === 'denied'
              ? 'Motion was blocked. Tap to ask again'
              : "This phone or browser can't read motion"}
        </SecondaryButton>
      )}

      <div style={{ minHeight: 24, fontSize: 16, fontWeight: 900, color: theme.callout, textAlign: 'center' }} aria-live="polite">
        {busy ? 'Rolling…' : last}
      </div>

      {flight && <FlyingDice flight={flight} />}
    </Screen>
  );
}
