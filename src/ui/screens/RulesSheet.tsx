import { useEffect, type CSSProperties, type ReactNode } from 'react';
import type { Rules } from '../../engine';
import type { Theme } from '../../theme/themes';
import { Icons } from '../icons';
import { DARK_INK, display } from '../style';

interface RulesSheetProps {
  theme: Theme;
  rules: Rules;
  onClose: () => void;
}

/** Bottom sheet with the active settings and short rule summaries (Rules.dc.html). */
export function RulesSheet({ theme, rules, onClose }: RulesSheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const two = rules.diceMode === 'two';
  const p = theme.players;
  const sections: [string, string, string][] = [
    [p.green, 'Getting born', two ? 'Roll a 6 to bring a man out of your yard. Double 6 can born two at once.' : 'Roll a 6 to bring a man out of your yard.'],
    [p.gold, 'Sixes', two ? 'Any 6 gives you one more roll. Double 6 still gives just one.' : 'A 6 gives you one more roll, as many times as you roll it.'],
    [p.red, 'Killing', 'Land on a man and he goes back to his yard. No safe squares on the track, not even a start square.'],
    two
      ? [p.black, 'Blocks', 'Two or three of your men on one square. Nobody passes. Only a double moves it together, and only another block can kill it.']
      : [p.black, 'Blocks', 'Two or three of your men on one square. Nobody passes and nobody can kill it. It breaks when you move a man off.'],
    two
      ? [theme.bar, 'Two dice', 'Use both dice. Split them across two men or put both on one.']
      : [theme.bar, 'One die', 'Roll one die and move one man by it.'],
    [p.green, 'Reaching heaven', 'Go all the way round, then up your own lane. You need the exact count, or move another man.'],
  ];
  if (rules.heavenless) sections.push([p.gold, 'Heaven-less', 'The game is a draw for everyone once every player has a man in heaven.']);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 30 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(12,8,5,0.55)' }} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="This game's rules"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          top: 64,
          maxWidth: 430,
          margin: '0 auto',
          background: theme.cream,
          color: DARK_INK,
          borderRadius: '22px 22px 0 0',
          boxShadow: '0 -10px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: "'Nunito', system-ui, sans-serif",
          animation: 'ludi-sheet 0.2s ease-out',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }} aria-hidden="true">
          <div style={{ width: 44, height: 5, borderRadius: 3, background: '#8A6A44' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 10px 20px' }}>
          <h2 style={{ ...display(34), margin: 0, fontWeight: 400 }}>This game's rules</h2>
          <button
            aria-label="Close rules"
            onClick={onClose}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              color: DARK_INK,
              background: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {Icons.close}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 20px 12px' }}>
          <Chip style={{ background: '#2F7D32', color: '#FFFFFF' }}>{two ? 'Two dice' : 'One die'}</Chip>
          <Chip style={{ background: DARK_INK, color: '#EFE3C8' }}>{theme.name.replace(/ Edition$/, '')} board</Chip>
          {rules.heavenless ? (
            <Chip style={{ background: '#E8B21C', color: DARK_INK }}>Heaven-less on</Chip>
          ) : (
            <Chip style={{ border: '1.5px dashed #6B5235', color: '#4A3A28', fontWeight: 800 }}>Heaven-less off</Chip>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '0 20px 24px', overflowY: 'auto' }}>
          {sections.map(([dot, title, body]) => (
            <div key={title} style={{ display: 'flex', gap: 14, padding: '13px 0', borderTop: '1.5px solid rgba(27,23,20,0.14)' }}>
              <div
                aria-hidden="true"
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  marginTop: 4,
                  flexShrink: 0,
                  background: dot,
                  boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,0.35)',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ fontSize: 16, fontWeight: 900 }}>{title}</div>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: '#3A2E22' }}>{body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Chip({ children, style }: { children: ReactNode; style: CSSProperties }) {
  return <div style={{ padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 900, ...style }}>{children}</div>;
}
