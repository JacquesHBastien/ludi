import { useState } from 'react';
import { COLORS, isDiagonal, type Color, type Rules } from '../../engine';
import { Board } from '../../board/Board';
import { CapIcon } from '../../board/Cap';
import { HIGHLIGHT, THEME_IDS, getTheme, type ThemeId } from '../../theme/themes';
import { IconButton, PrimaryButton, Screen, SectionLabel } from '../kit';
import { Icons } from '../icons';
import { DARK_INK, ROOTS, display, seatInfo } from '../style';

export interface SetupResult {
  seats: { color: Color; name: string }[];
  themeId: ThemeId;
  rules: Rules;
  /** What was typed, empty names included, to remember for next time. */
  typed: Partial<Record<Color, string>>;
}

interface SetupProps {
  initial: { themeId: ThemeId; rules: Rules; names: Partial<Record<Color, string>> };
  onBack: () => void;
  onStart: (result: SetupResult) => void;
}

const NO_MEN: Record<Color, number[]> = { red: [], gold: [], green: [], black: [] };

const panel = {
  borderRadius: 12,
  background: 'rgba(0,0,0,0.28)',
  border: '1.5px solid rgba(255,255,255,0.08)',
} as const;

export function Setup({ initial, onBack, onStart }: SetupProps) {
  const [themeId, setThemeId] = useState(initial.themeId);
  const [rules, setRules] = useState(initial.rules);
  const [names, setNames] = useState(initial.names);
  // Everyone starts as an empty "Add a player" row; the board comes first.
  const [colors, setColors] = useState<Color[]>([]);
  const [justAdded, setJustAdded] = useState<Color | null>(null);
  const theme = getTheme(themeId);

  const playing = COLORS.filter((c) => colors.includes(c));
  const problem =
    playing.length < 2
      ? 'Add at least two players.'
      : playing.length === 2 && !isDiagonal(playing[0]!, playing[1]!)
        ? `Two players sit across from each other: ${pairName('red', 'green')}, or ${pairName('gold', 'black')}.`
        : null;

  function pairName(a: Color, b: Color) {
    return `${seatInfo(theme, a).yard} and ${seatInfo(theme, b).yard}`;
  }

  const start = () =>
    onStart({
      seats: playing.map((c) => ({ color: c, name: names[c]?.trim() || seatInfo(theme, c).colorName })),
      themeId,
      rules,
      typed: names,
    });

  return (
    <Screen>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 44 }}>
        <IconButton label="Back" onClick={onBack}>
          {Icons.back}
        </IconButton>
        <h1 style={{ ...display(32), margin: 0, fontWeight: 400 }}>New game</h1>
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SectionLabel>Pick a board</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, paddingTop: 4 }}>
          {THEME_IDS.map((id) => {
            const t = getTheme(id);
            const on = id === themeId;
            return (
              <button
                key={id}
                onClick={() => setThemeId(id)}
                aria-pressed={on}
                aria-label={`${t.name} board`}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 7,
                  alignItems: 'stretch',
                  padding: 7,
                  borderRadius: 14,
                  cursor: 'pointer',
                  color: ROOTS.ink,
                  textAlign: 'center',
                  ...(on
                    ? { background: '#17110D', border: '2.5px solid #E8B21C', boxShadow: '0 0 0 2px rgba(232,178,28,0.25)' }
                    : { background: 'rgba(0,0,0,0.28)', border: '2.5px solid rgba(255,255,255,0.08)', opacity: 0.9 }),
                }}
              >
                {t.exclusive && <ExclusiveBadge />}
                {/* The real board, empty, so the preview always matches what you play on. */}
                <div aria-hidden="true" style={{ pointerEvents: 'none' }}>
                  <Board theme={t} seats={[]} men={NO_MEN} frame={4} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.name}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SectionLabel>Who's playing</SectionLabel>
        {COLORS.map((c) => {
          const seat = seatInfo(theme, c);
          const on = colors.includes(c);
          const id = `name-${c}`;
          if (!on) {
            return (
              <button
                key={c}
                onClick={() => {
                  setColors([...colors, c]);
                  setJustAdded(c);
                }}
                style={{
                  ...panel,
                  border: `1.5px dashed ${ROOTS.trim}`,
                  minHeight: 56,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 12px 6px 6px',
                  color: 'inherit',
                  cursor: 'pointer',
                  opacity: 0.85,
                }}
              >
                <div style={swatch}>
                  <span style={{ opacity: 0.5 }}>
                    <CapIcon color={c} fill={seat.paint} size={30} ring={false} />
                  </span>
                </div>
                <span style={{ fontSize: 16, fontWeight: 800 }}>Add a player for {seat.yard}</span>
              </button>
            );
          }
          return (
            <div key={c} style={{ ...panel, display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px 6px 6px' }}>
              <div style={swatch}>
                <CapIcon color={c} fill={seat.paint} size={30} ring={false} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <label htmlFor={id} style={display(17, { opacity: 0.85 })}>
                  {seat.yard}
                </label>
                <input
                  id={id}
                  value={names[c] ?? ''}
                  placeholder={seat.colorName}
                  maxLength={16}
                  autoComplete="off"
                  autoFocus={justAdded === c}
                  onChange={(e) => setNames({ ...names, [c]: e.target.value })}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `1.5px solid ${ROOTS.trim}`,
                    color: ROOTS.ink,
                    fontSize: 17,
                    fontWeight: 800,
                    padding: '3px 0',
                    outline: 'none',
                    width: '100%',
                    minHeight: 30,
                  }}
                />
              </div>
              <button
                aria-label={`Remove ${names[c]?.trim() || seat.yard}`}
                onClick={() => setColors(colors.filter((x) => x !== c))}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: 'transparent',
                  border: 'none',
                  color: ROOTS.ink,
                  opacity: 0.7,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                {Icons.close}
              </button>
            </div>
          );
        })}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SectionLabel>House rules</SectionLabel>
        <div style={{ ...panel, display: 'flex', flexDirection: 'column' }}>
          <RuleSwitch
            name="Two dice"
            desc="Use both dice every turn. Doubles move blocks."
            on={rules.diceMode === 'two'}
            onToggle={() => setRules({ ...rules, diceMode: rules.diceMode === 'two' ? 'one' : 'two' })}
          />
          <RuleSwitch
            name="Heaven-less"
            desc="Draw once everybody has a man in heaven."
            on={rules.heavenless}
            onToggle={() => setRules({ ...rules, heavenless: !rules.heavenless })}
          />
          <div style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, opacity: 0.8, lineHeight: 1.35 }}>
            Always on: blocks, every 6 rolls again, no safe squares on the track.
          </div>
        </div>
      </section>

      {/* Pinned to the bottom so Start is always in reach, even on short phones. */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          margin: 'auto -16px -18px',
          padding: '14px 16px 18px',
          background: `linear-gradient(to bottom, rgba(58,36,22,0), ${ROOTS.table} 22px)`,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {problem && (
          <div role="status" style={{ fontSize: 14, fontWeight: 800, color: HIGHLIGHT, textAlign: 'center', lineHeight: 1.35 }}>
            {problem}
          </div>
        )}
        <PrimaryButton disabled={!!problem} onClick={start}>
          Start the game
        </PrimaryButton>
      </div>
    </Screen>
  );
}

const swatch = {
  width: 44,
  height: 44,
  borderRadius: 10,
  background: 'rgba(0,0,0,0.25)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
} as const;

function ExclusiveBadge() {
  return (
    <div
      style={{
        position: 'absolute',
        top: -9,
        right: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px 2px 6px',
        borderRadius: 999,
        background: HIGHLIGHT,
        color: DARK_INK,
        border: `1.5px solid ${DARK_INK}`,
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
      }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2l3 6.5 7 .8-5.2 4.8 1.5 7L12 17.6 5.7 21.1l1.5-7L2 9.3l7-.8z" fill={DARK_INK} />
      </svg>
      Exclusive
    </div>
  );
}

function RuleSwitch({ name, desc, on, onToggle }: { name: string; desc: string; on: boolean; onToggle: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 900 }}>{name}</div>
        <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, lineHeight: 1.3 }}>{desc}</div>
      </div>
      <button
        role="switch"
        aria-checked={on}
        aria-label={name}
        onClick={onToggle}
        style={{
          width: 64,
          height: 44,
          padding: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 56,
            height: 32,
            borderRadius: 16,
            border: `2px solid ${DARK_INK}`,
            padding: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: on ? 'flex-end' : 'flex-start',
            background: on ? '#2F7D32' : '#5A4A3C',
          }}
        >
          <div style={{ width: 24, height: 24, borderRadius: 12, background: '#F4E9D4', boxShadow: '0 1px 2px rgba(0,0,0,0.4)' }} />
        </div>
      </button>
    </div>
  );
}
