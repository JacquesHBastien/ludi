import { useEffect, type CSSProperties, type ReactElement } from 'react';
import type { GameState, Rules } from '../../engine';
import { CapIcon } from '../../board/Cap';
import type { Theme } from '../../theme/themes';
import { CountWord, copy, countWord } from '../copy';
import { DARK_INK, accentFor, display, seatInfo } from '../style';
import type { Moment } from '../turn';

interface MomentProps {
  theme: Theme;
  game: GameState;
  rules: Rules;
  moment: Moment;
  patois: boolean;
  onDone: () => void;
}

/** The big Kill / Born / Block / Heaven overlay (Moment.dc.html). */
export function MomentOverlay({ theme, game, rules, moment, patois, onDone }: MomentProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => (e.key === 'Escape' || e.key === 'Enter') && onDone();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  const t = copy(patois);
  const me = seatInfo(theme, moment.color, game);
  const cap = (color: typeof moment.color, x: number, y: number, size: number, extra?: CSSProperties) => (
    <div key={`${color}${x}`} style={{ position: 'absolute', left: x, top: y, filter: 'drop-shadow(0 4px 0 rgba(0,0,0,0.6))', ...extra }}>
      <CapIcon color={color} fill={theme.players[color]} size={size} />
    </div>
  );

  let accent: string;
  let caps: ReactElement[];
  let shout: string;
  let line: string;
  let sub: string;
  let cta: string;
  let taunt: string | undefined;

  switch (moment.kind) {
    case 'kill': {
      const victim = seatInfo(theme, moment.victim, game);
      accent = theme.players.red;
      caps = [cap(moment.victim, 18, 30, 64, { transform: 'rotate(-24deg)', opacity: 0.85 }), cap(moment.color, 92, 6, 92)];
      shout = moment.bounty ? t.bountyShout : moment.revenge ? t.revengeShout : t.killShout;
      line = moment.bounty
        ? t.bountyLine(victim.name)
        : moment.revenge
          ? t.revengeLine(victim.name)
          : moment.count > 1
          ? `${me.name} killed ${victim.name}'s block.`
          : `${me.name} killed ${victim.name}'s man.`;
      taunt = moment.taunt;
      sub = t.killSub(victim.yard);
      if (moment.count > 1) sub = `${CountWord(moment.count)} men go back. ${sub}`;
      cta = 'Keep going';
      break;
    }
    case 'born':
      accent = accentFor(theme, moment.color);
      caps = moment.count > 1 ? [cap(moment.color, 34, 14, 84), cap(moment.color, 82, 2, 84)] : [cap(moment.color, 54, 6, 92)];
      shout = t.bornShout;
      line =
        moment.count > 1
          ? `${me.name} rolled double 6. Two new men are on the board.`
          : `${me.name} rolled a 6. A new man is on the board.`;
      sub = moment.rollAgain ? 'Six means you roll again.' : 'Use your other die, then roll again.';
      cta = moment.rollAgain ? 'Roll again' : 'Keep going';
      break;
    case 'block':
      accent = theme.players.gold;
      caps = [cap(moment.color, 44, 18, 84), cap(moment.color, 72, 2, 84)];
      shout = t.blockShout;
      line = `${me.name} stacked ${countWord(moment.count)} men. Nobody can pass.`;
      sub = rules.diceMode === 'two' ? 'Only another block landing on it can kill it.' : 'Nobody can kill it while it stands.';
      cta = 'Got it';
      break;
    case 'heaven':
      accent = theme.players.gold;
      caps = [cap(moment.color, 54, 6, 92)];
      shout = t.heavenShout;
      line = `${me.name} got a man home.`;
      sub = moment.home >= 4 ? 'All four men are in heaven!' : `${moment.home} of 4 in heaven. ${4 - moment.home} more to go.`;
      cta = 'Keep going';
      break;
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40, fontFamily: "'Nunito', system-ui, sans-serif", color: theme.ink }}>
      <div onClick={onDone} style={{ position: 'absolute', inset: 0, background: 'rgba(12,8,5,0.62)' }} aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={shout}
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          top: '50%',
          transform: 'translateY(-50%)',
          maxWidth: 382,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          textAlign: 'center',
          padding: '32px 22px 26px',
          borderRadius: 20,
          background: theme.frame,
          border: `2px solid ${theme.trim}`,
          boxShadow: `0 0 0 6px ${accent}, 0 24px 50px rgba(0,0,0,0.6)`,
        }}
      >
        <div style={{ position: 'relative', height: 104, width: 200, animation: 'ludi-pop 0.25s ease-out' }} aria-hidden="true">
          {caps}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={display(shout.length > 10 ? 52 : 64, { lineHeight: 0.95, color: accent })}>{shout}</div>
          {taunt && <div style={display(30, { lineHeight: 1.05, color: theme.callout })}>“{taunt}”</div>}
          <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.35 }}>{line}</div>
          <div style={{ fontSize: 15, fontWeight: 600, opacity: 0.85, lineHeight: 1.35 }}>{sub}</div>
        </div>
        <button
          autoFocus
          onClick={onDone}
          style={{
            height: 52,
            padding: '0 28px',
            borderRadius: 14,
            background: '#E8B21C',
            color: DARK_INK,
            border: `3px solid ${DARK_INK}`,
            boxShadow: '0 5px 0 #000',
            fontSize: 18,
            fontWeight: 900,
            cursor: 'pointer',
          }}
        >
          {cta}
        </button>
      </div>
    </div>
  );
}
