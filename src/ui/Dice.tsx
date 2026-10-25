import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Theme } from '../theme/themes';
import { GRAIN, HIGHLIGHT } from '../theme/themes';
import { DARK_INK } from './style';
import { sfx } from './sound';
import { shakePower } from './throw';

const FACES: Record<number, number[]> = {
  1: [0, 0, 0, 0, 1, 0, 0, 0, 0],
  2: [0, 0, 1, 0, 0, 0, 1, 0, 0],
  3: [0, 0, 1, 0, 1, 0, 1, 0, 0],
  4: [1, 0, 1, 0, 0, 0, 1, 0, 1],
  5: [1, 0, 1, 0, 1, 0, 1, 0, 1],
  6: [1, 0, 1, 1, 0, 1, 1, 0, 1],
};

export interface DieView {
  /** null = not rolled yet. */
  value: number | null;
  used?: boolean;
  selected?: boolean;
}

export function Die({ value, used, selected }: DieView) {
  return (
    <div
      role="img"
      aria-label={value ? `Die showing ${value}${used ? ', used' : ''}${selected ? ', picked' : ''}` : 'Die, not rolled'}
      style={{
        width: 54,
        height: 54,
        borderRadius: 11,
        background: '#F4ECDA',
        border: `2px solid ${DARK_INK}`,
        boxShadow: selected ? `0 3px 0 ${DARK_INK}, 0 0 0 3px ${HIGHLIGHT}` : `0 3px 0 ${DARK_INK}`,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        padding: 7,
        gap: 2,
        opacity: used ? 0.35 : 1,
        transform: selected ? 'translateY(-2px)' : undefined,
      }}
    >
      {(value ? FACES[value]! : Array<number>(9).fill(0)).map((on, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {on ? <div style={{ width: 9, height: 9, borderRadius: 5, background: DARK_INK }} /> : null}
        </div>
      ))}
    </div>
  );
}

interface TrayProps {
  theme: Theme;
  dice: DieView[];
  /** The dice are out of the tray, flying over the board: show their empty slots. */
  rolling?: boolean;
  /** Hold the tray to shake the dice, let go to throw. Called with the throw power. */
  onThrow?: (power: number) => void;
  /** Tap one die to pick it. */
  onPick?: (index: number) => void;
}

/** The sunken dice tray from the mockup. The whole tray is the roll button when rolling is allowed. */
export function DiceTray({ theme, dice, rolling, onThrow, onPick }: TrayProps) {
  const tray = {
    display: 'flex',
    gap: 10,
    padding: 8,
    borderRadius: 14,
    backgroundColor: theme.frame,
    backgroundImage: GRAIN.dark,
    boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.5)',
    border: 'none',
    flexShrink: 0,
  } as const;

  if (rolling) {
    return (
      <div style={tray} aria-label="Rolling" role="status">
        {dice.map((_, i) => (
          <div key={i} style={{ width: 54, height: 54, borderRadius: 11, border: '2px dashed rgba(255,255,255,0.18)' }} />
        ))}
      </div>
    );
  }
  if (onThrow) return <ShakeTray tray={tray} dice={dice} onThrow={onThrow} />;
  return (
    <div style={tray}>
      {dice.map((d, i) =>
        onPick && d.value && !d.used ? (
          <button
            key={i}
            onClick={() => onPick(i)}
            aria-pressed={!!d.selected}
            style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 11 }}
          >
            <Die {...d} />
          </button>
        ) : (
          <Die key={i} {...d} />
        ),
      )}
    </div>
  );
}

const buzz = (ms: number | number[]) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // iPhones don't let web pages vibrate
  }
};

/** The tray as the dice cup: press and hold to shake (rattle, wobble, buzz), let go to throw. */
function ShakeTray({ tray, dice, onThrow }: { tray: object; dice: DieView[]; onThrow: (power: number) => void }) {
  const [shaking, setShaking] = useState(0);
  const held = useRef<{ start: number; timer: ReturnType<typeof setInterval> } | null>(null);
  useEffect(() => () => clearInterval(held.current?.timer), []);

  const start = (e: ReactPointerEvent) => {
    if (held.current) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // keep going without capture
    }
    const began = performance.now();
    setShaking(0.3);
    const timer = setInterval(() => {
      const p = shakePower(performance.now() - began);
      setShaking(p);
      sfx.shake(p);
      buzz(10 + Math.round(p * 12));
    }, 120);
    held.current = { start: began, timer };
  };
  const release = () => {
    const h = held.current;
    if (!h) return;
    clearInterval(h.timer);
    held.current = null;
    setShaking(0);
    buzz(30);
    onThrow(shakePower(performance.now() - h.start));
  };

  return (
    <button
      aria-label="Hold to shake the dice, let go to throw"
      onPointerDown={start}
      onPointerUp={release}
      onPointerCancel={release}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onThrow(1);
        }
      }}
      style={{
        ...tray,
        cursor: 'pointer',
        animation: shaking ? undefined : 'ludi-pulse 1.4s ease-in-out infinite',
        outline: `2px solid ${HIGHLIGHT}`,
        outlineOffset: 2,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      {dice.map((d, i) => (
        <div
          key={i}
          style={{ animation: shaking ? `ludi-shake ${Math.max(0.08, 0.22 - shaking * 0.09)}s linear infinite` : undefined }}
        >
          <Die {...d} />
        </div>
      ))}
    </button>
  );
}
