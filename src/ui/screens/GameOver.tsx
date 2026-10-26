import type { GameState } from '../../engine';
import { CapIcon } from '../../board/Cap';
import type { Theme } from '../../theme/themes';
import { copy } from '../copy';
import { Ornament, PrimaryButton, Screen, SecondaryButton } from '../kit';
import { display, seatInfo } from '../style';
import { ranking } from '../turn';
import { awards } from '../compete';
import { statsOf } from '../../engine';

interface GameOverProps {
  theme: Theme;
  game: GameState;
  patois: boolean;
  /** Awards and kill counts only show in competitive games. */
  competitive: boolean;
  onPlayAgain: () => void;
  onHome: () => void;
  /** Offered when someone has won but two or more players can still play for the other places. */
  onKeepPlaying?: () => void;
}

const AWARD_ICON = { butcher: '☠', ghost: '👻', unlucky: '🪦', sixes: '🎲' } as const;

/** Winner with placings, or the heaven-less draw (GameOver.dc.html). */
export function GameOver({ theme, game, patois, competitive, onPlayAgain, onHome, onKeepPlaying }: GameOverProps) {
  const draw = game.result?.kind === 'draw';
  const order = ranking(game);
  const winner = seatInfo(theme, order[0]!, game);

  const capAt = (color: (typeof order)[number], x: number, y: number, size: number) => (
    <div key={color} style={{ position: 'absolute', left: x, top: y, filter: 'drop-shadow(0 5px 0 rgba(0,0,0,0.6))' }}>
      <CapIcon color={color} fill={theme.players[color]} size={size} />
    </div>
  );
  const spread = (240 - 70) / Math.max(order.length - 1, 1);

  return (
    <Screen theme={theme} padding="48px 20px 22px" gap={24}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
        <Ornament theme={theme} />
        <div style={{ position: 'relative', height: 130, width: 240 }} aria-hidden="true">
          {draw
            ? order.map((c, i) => capAt(c, i * spread, i % 2 ? 18 : 34, 70))
            : capAt(winner.color, 58, 0, 124)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.85 }}>
            {draw ? 'Heaven-less' : `${winner.name} wins`}
          </div>
          <h1 style={{ ...display(66, { lineHeight: 0.95, color: theme.callout }), margin: 0, fontWeight: 400 }}>
            {draw ? "It's a draw" : copy(true).winShout}
          </h1>
          <div style={{ fontSize: 17, fontWeight: 700, opacity: 0.92 }}>
            {draw ? 'Everybody got a man to heaven.' : `All four men reach heaven for ${winner.yard}.`}
          </div>
        </div>
      </div>

      <ol style={{ display: 'flex', flexDirection: 'column', gap: 8, listStyle: 'none', margin: 0, padding: 0 }}>
        {order.map((c, i) => {
          const s = seatInfo(theme, c, game);
          const lead = !draw && i === 0;
          return (
            <li
              key={c}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 14px 8px 8px',
                borderRadius: 14,
                ...(lead
                  ? { background: theme.frame, border: '2px solid #E8B21C' }
                  : { background: 'rgba(0,0,0,0.28)', border: '2px solid rgba(255,255,255,0.08)' }),
              }}
            >
              <div style={display(26, { width: 34, textAlign: 'center' })}>{draw ? '=' : i + 1}</div>
              <CapIcon color={c} fill={s.paint} size={30} ring={false} />
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                <div style={display(16, { opacity: 0.8 })}>{s.yard}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, opacity: 0.9, textAlign: 'right' }}>
                {s.home}/4 home
                {competitive && statsOf(game).kills[c] > 0 && <div style={{ fontSize: 12, opacity: 0.85 }}>☠ {statsOf(game).kills[c]}</div>}
              </div>
            </li>
          );
        })}
      </ol>

      {competitive && awards(game, patois).length > 0 && (
        <section aria-label="Awards" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {awards(game, patois).map((a) => (
            <div
              key={a.id}
              style={{
                padding: '10px 12px',
                borderRadius: 14,
                background: theme.frame,
                border: `2px solid ${theme.trim}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              <div style={{ fontSize: 18, lineHeight: 1 }} aria-hidden="true">
                {AWARD_ICON[a.id]}
              </div>
              <div style={display(22, { color: theme.callout })}>{a.title}</div>
              <div style={{ fontSize: 15, fontWeight: 900 }}>{a.colors.map((c) => seatInfo(theme, c, game).name).join(' & ')}</div>
              <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85 }}>{a.detail}</div>
            </div>
          ))}
        </section>
      )}

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {onKeepPlaying && (
          <SecondaryButton trim={theme.trim} height={56} onClick={onKeepPlaying}>
            Keep playing for {game.placements.length + 1 === 2 ? '2nd' : game.placements.length + 1 === 3 ? '3rd' : 'next'} place
          </SecondaryButton>
        )}
        <PrimaryButton onClick={onPlayAgain}>Play again</PrimaryButton>
        <SecondaryButton trim={theme.trim} height={52} onClick={onHome} style={{ fontSize: 17 }}>
          Back to start
        </SecondaryButton>
      </div>
    </Screen>
  );
}
