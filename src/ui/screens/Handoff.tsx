import type { Color, GameState } from '../../engine';
import { CapIcon } from '../../board/Cap';
import { CAP, type Theme } from '../../theme/themes';
import { copy } from '../copy';
import { Ornament, PrimaryButton, Screen } from '../kit';
import { display, seatInfo } from '../style';

interface HandoffProps {
  theme: Theme;
  game: GameState;
  /** Whose turn just ended. Null when the game is starting or coming back after a reload. */
  doneBy: Color | null;
  patois: boolean;
  onReady: () => void;
}

/** Full screen "Pass the phone" between turns. The board stays hidden until the next player taps. */
export function Handoff({ theme, game, doneBy, patois, onReady }: HandoffProps) {
  const next = seatInfo(theme, game.turn.color, game);
  const kicker = doneBy
    ? `${seatInfo(theme, doneBy, game).name}'s turn is done`
    : game.events.length === 0
      ? "Let's play"
      : 'Welcome back';

  return (
    <Screen theme={theme} padding="56px 24px 40px" gap={24} style={{ alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <Ornament theme={theme} />
        <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.9 }}>{kicker}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26, textAlign: 'center' }}>
        <div
          style={{
            width: 220,
            height: 220,
            borderRadius: 12,
            background: next.paint,
            border: `9px solid ${theme.frame}`,
            boxShadow: `0 0 0 2px ${theme.trim}, 0 14px 30px rgba(0,0,0,0.5)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <CapIcon color={next.color} fill={next.paint} size={104} />
          <div style={display(30, { color: CAP[next.color].labelInk })}>{next.yard}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 19, fontWeight: 800 }}>{doneBy || game.events.length > 0 ? 'Pass the phone to' : 'First up'}</div>
          <div style={display(72, { lineHeight: 0.95, color: theme.callout, overflowWrap: 'anywhere' })}>{next.name}</div>
          <div style={{ fontSize: 17, fontWeight: 700, opacity: 0.92 }}>
            You're {next.colorName}, the {next.shapeWord} men
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
        <PrimaryButton onClick={onReady} style={{ fontSize: 22 }}>
          {copy(patois).ready}
        </PrimaryButton>
        <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.85 }}>Board stays hidden until {next.name} taps</div>
      </div>
    </Screen>
  );
}
