import type { Theme } from '../theme/themes';
import { GRAIN, HIGHLIGHT } from '../theme/themes';
import { DARK_INK } from './style';

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
  /** Tap the tray to roll. */
  onRoll?: () => void;
  /** Tap one die to pick it. */
  onPick?: (index: number) => void;
}

/** The sunken dice tray from the mockup. The whole tray is the roll button when rolling is allowed. */
export function DiceTray({ theme, dice, rolling, onRoll, onPick }: TrayProps) {
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
  if (onRoll) {
    return (
      <button
        onClick={onRoll}
        aria-label="Roll the dice"
        style={{ ...tray, cursor: 'pointer', animation: 'ludi-pulse 1.4s ease-in-out infinite', outline: `2px solid ${HIGHLIGHT}`, outlineOffset: 2 }}
      >
        {dice.map((d, i) => (
          <Die key={i} {...d} />
        ))}
      </button>
    );
  }
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
