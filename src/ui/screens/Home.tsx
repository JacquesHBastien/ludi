import { useState, type CSSProperties } from 'react';
import { DEFAULT_RULES } from '../../engine';
import { heavenColor } from '../../theme/themes';
import { PrimaryButton, Screen, SecondaryButton } from '../kit';
import { Icons } from '../icons';
import { DARK_INK, ROOTS, display } from '../style';
import { RulesSheet } from './RulesSheet';

interface HomeProps {
  /** A saved game is waiting: offer to keep playing it. */
  canContinue: boolean;
  onContinue: () => void;
  onNewGame: () => void;
}

export function Home({ canContinue, onContinue, onNewGame }: HomeProps) {
  const [rules, setRules] = useState(false);

  return (
    <Screen padding="72px 24px 36px" gap={40}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>
        <MiniBoard />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1 style={{ ...display(84, { lineHeight: 0.9 }), margin: 0, fontWeight: 400 }}>Ludi</h1>
          <div style={{ fontSize: 17, fontWeight: 700, opacity: 0.9 }}>The yard game, for the whole family</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 'auto' }}>
        {canContinue && (
          <PrimaryButton height={66} onClick={onContinue}>
            Keep playing
          </PrimaryButton>
        )}
        {canContinue ? (
          <SecondaryButton onClick={onNewGame}>
            {Icons.phone}
            New game on this phone
          </SecondaryButton>
        ) : (
          <PrimaryButton height={66} onClick={onNewGame}>
            {Icons.phone}
            Play on this phone
          </PrimaryButton>
        )}
        <SecondaryButton disabled>
          {Icons.globe}
          Start an online game
          <Soon />
        </SecondaryButton>
        <SecondaryButton disabled>
          {Icons.join}
          Join with a code
          <Soon />
        </SecondaryButton>
        <button
          onClick={() => setRules(true)}
          style={{
            background: 'none',
            border: 'none',
            color: ROOTS.callout,
            textDecoration: 'underline',
            fontSize: 15,
            fontWeight: 800,
            padding: 12,
            minHeight: 44,
            cursor: 'pointer',
          }}
        >
          How to play
        </button>
      </div>
      {rules && <RulesSheet theme={ROOTS} rules={DEFAULT_RULES} onClose={() => setRules(false)} />}
    </Screen>
  );
}

function Soon() {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        padding: '2px 7px',
        borderRadius: 999,
        background: ROOTS.trim,
        color: DARK_INK,
      }}
    >
      Soon
    </span>
  );
}

/** The tilted little board on the home screen, as drawn in Home.dc.html. */
function MiniBoard() {
  const t = ROOTS;
  const [red, gold, green, black] = [t.players.red, t.players.gold, t.players.green, t.players.black];
  const cream = t.cream;
  const wood = t.bar;
  const box = (style: CSSProperties, key: string) => (
    <div key={key} style={{ position: 'absolute', ...style }} />
  );
  const bars = (colors: string[], place: (i: number) => CSSProperties, horizontal: boolean, key: string) =>
    colors.map((c, i) =>
      box({ ...place(i), width: horizontal ? 38 : 9, height: horizontal ? 9 : 38, background: c }, `${key}${i}`),
    );
  return (
    <div
      aria-hidden="true"
      style={{
        width: 176,
        height: 176,
        background: t.frame,
        borderRadius: 12,
        padding: 8,
        boxShadow: `0 0 0 2px ${t.trim}, 0 14px 30px rgba(0,0,0,0.5)`,
        transform: 'rotate(-4deg)',
      }}
    >
      <div style={{ position: 'relative', width: 160, height: 160, background: t.line }}>
        {box({ left: 1, top: 1, width: 48, height: 48, background: red }, 'yr')}
        {box({ right: 1, top: 1, width: 48, height: 48, background: gold }, 'yg')}
        {box({ right: 1, bottom: 1, width: 48, height: 48, background: green }, 'yn')}
        {box({ left: 1, bottom: 1, width: 48, height: 48, background: black, boxShadow: 'inset 0 0 0 1px #3A2E24' }, 'yb')}
        {bars([cream, red, green, gold], (i) => ({ left: 61, top: 4 + i * 12 }), true, 't')}
        {bars([gold, black, wood, green], (i) => ({ left: 61, bottom: 4 + i * 12 }), true, 'b')}
        {bars([green, gold, red, cream], (i) => ({ top: 61, left: 4 + i * 12 }), false, 'l')}
        {bars([wood, red, gold, green], (i) => ({ top: 61, right: 4 + i * 12 }), false, 'r')}
        <svg width="38" height="38" viewBox="0 0 4 4" style={{ position: 'absolute', left: 61, top: 61 }}>
          <polygon points="0,0 2,2 0,4" fill={red} />
          <polygon points="0,0 4,0 2,2" fill={heavenColor(t, "gold")} />
          <polygon points="4,0 4,4 2,2" fill={green} />
          <polygon points="0,4 4,4 2,2" fill={black} />
          <path d="M0,0 L4,4 M4,0 L0,4" stroke={gold} strokeWidth="0.4" />
        </svg>
      </div>
    </div>
  );
}
