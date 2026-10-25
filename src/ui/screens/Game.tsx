import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Board, type Moving } from '../../board/Board';
import { CapIcon } from '../../board/Cap';
import { HEAVEN, YARD, applyAction, legalMoves, type Action, type Color, type GameState, type Progress } from '../../engine';
import { CAP, HIGHLIGHT, type Theme } from '../../theme/themes';
import { copy } from '../copy';
import { DiceTray, type DieView } from '../Dice';
import { FlyingDice, type Flight } from '../FlyingDice';
import { IconButton, PrimaryButton, Screen } from '../kit';
import { Icons } from '../icons';
import { DARK_INK, GOLD_BUTTON, display, seatInfo } from '../style';
import { rollDice } from '../random';
import { sfx } from '../sound';
import { movesForDie, nextColor, optionLabel, optionsAt, pickMoment, usedFlags, type Moment } from '../turn';
import { GameOver } from './GameOver';
import { Handoff } from './Handoff';
import { MomentOverlay } from './MomentOverlay';
import { RulesSheet } from './RulesSheet';

interface GameProps {
  game: GameState;
  theme: Theme;
  patois: boolean;
  muted: boolean;
  /** Dev only: lets the tester choose the dice. */
  testDice?: boolean;
  onChange: (game: GameState) => void;
  onTogglePatois: () => void;
  onToggleSound: () => void;
  onHome: () => void;
  onPlayAgain: () => void;
}

type View = 'handoff' | 'play' | 'turnOver';

/** How long the dice spend flying over the board. */
const ROLL_MS = 1700;

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Game(props: GameProps) {
  const { game, theme, patois, muted, testDice, onChange, onTogglePatois, onToggleSound, onHome, onPlayAgain } = props;
  const [view, setView] = useState<View>('handoff');
  const [doneBy, setDoneBy] = useState<Color | null>(null);
  const [lastRoll, setLastRoll] = useState<{ color: Color; dice: number[]; noMoves: boolean } | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [choosing, setChoosing] = useState<Progress | null>(null);
  const [moment, setMoment] = useState<Moment | null>(null);
  const [results, setResults] = useState(game.status === 'over');
  const [sheet, setSheet] = useState<'rules' | 'menu' | null>(null);
  /** A roll or move is animating; the engine result is applied when it lands. */
  const [busy, setBusy] = useState<{ kind: 'roll'; flight: Flight | null } | { kind: 'move'; moving: Moving } | null>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const t = copy(patois);
  const { turn } = game;
  const legal = legalMoves(game);

  function act(action: Action) {
    if (busy) return;
    const before = game;
    const after = applyAction(before, action);
    setPicked(null);
    setChoosing(null);
    const land = (ms: number) => {
      if (ms <= 0) return settle(before, after);
      timer.current = setTimeout(() => settle(before, after), ms);
    };

    if (action.type === 'roll') {
      if (reducedMotion()) {
        sfx.roll();
        return land(0);
      }
      const tray = trayRef.current?.getBoundingClientRect();
      const board = boardRef.current?.getBoundingClientRect();
      const flight = tray && board ? { values: action.dice, tray, board, duration: ROLL_MS } : null;
      sfx.roll(ROLL_MS / 1000);
      setBusy({ kind: 'roll', flight });
      return land(ROLL_MS);
    }
    const m = action.move;
    const to = m.from === YARD ? 0 : m.from + m.die;
    const path = m.from === YARD ? [0] : Array.from({ length: to - m.from }, (_, i) => m.from + 1 + i);
    if (reducedMotion()) return land(0);
    const stepMs = path.length > 8 ? 85 : 120;
    const moving: Moving = { id: Date.now(), color: before.turn.color, from: m.from, count: m.kind === 'pair' ? 2 : 1, path, stepMs, onStep: sfx.step };
    setBusy({ kind: 'move', moving });
    land(30 + path.length * stepMs + 90);
  }

  /** Apply an action's result once its animation has landed. */
  function settle(before: GameState, after: GameState) {
    setBusy(null);
    onChange(after);
    playSounds(before, after);

    const rolled = after.events.find((e) => e.type === 'rolled');
    if (rolled) setLastRoll({ color: rolled.color, dice: rolled.dice, noMoves: after.events.some((e) => e.type === 'noMoves') });
    setMoment(pickMoment(after, before.turn.color));

    const firstWinner = before.placements.length === 0 && after.placements.length > 0;
    if (after.status === 'over' || firstWinner) setResults(true);
    if (after.status === 'playing' && after.turn.color !== before.turn.color) {
      setDoneBy(before.turn.color);
      setView('turnOver');
    }
  }

  const tapMan = (from: Progress) => {
    if (busy) return;
    const options = optionsAt(legal, from, picked);
    if (options.length === 1) act({ type: 'move', move: options[0]! });
    else if (options.length > 1) setChoosing(from);
  };

  // --- Screens that replace the board ---------------------------------------------------------

  if (results && !moment) {
    const canContinue = game.status === 'playing';
    return (
      <GameOver
        theme={theme}
        game={game}
        onPlayAgain={onPlayAgain}
        onHome={onHome}
        onKeepPlaying={canContinue ? () => setResults(false) : undefined}
      />
    );
  }

  if (view === 'handoff') {
    return (
      <Handoff
        theme={theme}
        game={game}
        doneBy={doneBy}
        patois={patois}
        onReady={() => {
          setView('play');
          setLastRoll(null);
        }}
      />
    );
  }

  // --- The board --------------------------------------------------------------------------------

  const active = view === 'turnOver' ? doneBy! : turn.color;
  const me = seatInfo(theme, active, game);
  const next = seatInfo(theme, view === 'turnOver' ? turn.color : nextColor(game, turn.color), game);
  // Taps are ignored while dice are in the air or a man is hopping.
  const playing = view === 'play' && !busy;

  const movable = playing && turn.phase === 'move' ? movesForDie(legal, picked).map((m) => m.from) : [];
  // A block on the board that can move together, versus a double 6 that can born two men.
  const pairLegal = legal.some((m) => m.kind === 'pair' && m.from !== YARD);
  const bornTwo = legal.some((m) => m.kind === 'pair' && m.from === YARD);

  let dice: DieView[];
  if (view === 'turnOver' && lastRoll) dice = lastRoll.dice.map((value) => ({ value, used: true }));
  else if (turn.phase === 'roll') dice = Array.from({ length: game.rules.diceMode === 'two' ? 2 : 1 }, () => ({ value: null }));
  else {
    const used = usedFlags(turn.rolled, turn.dice);
    dice = turn.rolled.map((value, i) => ({ value, used: used[i], selected: picked === value && !used[i] }));
  }
  // Picking a die only matters when two different numbers are left and each can move something.
  const canPick =
    playing && turn.phase === 'move' && turn.dice.length === 2 && turn.dice[0] !== turn.dice[1] && turn.dice.every((d) => legal.some((m) => m.die === d));

  const isDouble = turn.phase === 'move' && turn.rolled.length === 2 && turn.rolled[0] === turn.rolled[1];
  const shout = playing && isDouble ? t.double(turn.rolled[0]!, pairLegal) : '';

  return (
    <Screen theme={theme}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44 }}>
        <IconButton label="Menu" trim={theme.trim} onClick={() => setSheet('menu')}>
          {Icons.menu}
        </IconButton>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 3 }} aria-hidden="true">
            {(['red', 'gold', 'green'] as const).map((c) => (
              <div key={c} style={{ width: 6, height: 22, borderRadius: 2, background: theme.players[c] }} />
            ))}
          </div>
          <div style={display(38, { color: theme.ink })}>Ludi</div>
        </div>
        <IconButton label="Rules" trim={theme.trim} onClick={() => setSheet('rules')}>
          {Icons.rules}
        </IconButton>
      </header>

      <PlayerStrip theme={theme} game={game} active={active} />

      <div ref={boardRef} style={{ width: '100%', maxWidth: 354, alignSelf: 'center' }}>
        <Board
          theme={theme}
          seats={game.seats}
          men={game.men}
          movable={{ color: turn.color, froms: movable }}
          onTapMan={playing ? tapMan : undefined}
          names={Object.fromEntries(game.players.map((p) => [p.color, p.name]))}
          moving={busy?.kind === 'move' ? busy.moving : undefined}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }} aria-live="polite">
            <div style={{ fontSize: 13, fontWeight: 800, opacity: 0.85 }}>
              {view === 'turnOver' ? `${me.name}'s turn is done` : `${me.name}'s turn · ${me.yard}`}
            </div>
            <div style={display(shout.length > 22 ? 26 : 32, { lineHeight: 1.05, color: theme.callout, minHeight: 28 })}>{shout}</div>
          </div>
          <div ref={trayRef} style={{ flexShrink: 0 }}>
            <DiceTray
              theme={theme}
              dice={dice}
              rolling={busy?.kind === 'roll'}
              onRoll={playing && turn.phase === 'roll' ? () => act({ type: 'roll', dice: rollDice(game.rules.diceMode) }) : undefined}
              onPick={canPick ? (i) => setPicked(picked === turn.rolled[i] ? null : turn.rolled[i]!) : undefined}
            />
          </div>
        </div>

        <HintCard theme={theme}>
          {view === 'turnOver' ? (
            <>
              <HintTitle>
                {lastRoll?.noMoves && lastRoll.color === doneBy
                  ? `No man can move with ${lastRoll.dice.join(' + ')}.`
                  : 'Turn done.'}
              </HintTitle>
              <PrimaryButton height={54} style={{ fontSize: 19, marginTop: 6 }} onClick={() => setView('handoff')}>
                Pass to {next.name}
              </PrimaryButton>
            </>
          ) : turn.phase === 'roll' ? (
            <>
              <HintTitle>
                {busy?.kind === 'roll'
                  ? 'Rolling…'
                  : lastRoll?.color === turn.color && lastRoll.dice.includes(6)
                    ? 'Six! Roll again.'
                    : 'Tap the dice to roll.'}
              </HintTitle>
              <HintBody>
                {lastRoll?.color === turn.color && lastRoll.noMoves
                  ? 'No man could move that time, but the 6 gives you another roll.'
                  : game.men[turn.color].every((p) => p === YARD || p === HEAVEN)
                    ? 'You need a 6 to born a man.'
                    : 'Then tap a glowing man to move him.'}
              </HintBody>
            </>
          ) : choosing !== null ? (
            <>
              <HintTitle>Which move?</HintTitle>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {optionsAt(legal, choosing, picked).map((m) => (
                  <ChoiceButton key={`${m.kind}${m.die}`} onClick={() => act({ type: 'move', move: m })}>
                    {optionLabel(m, game.men[turn.color].filter((p) => p === choosing).length)}
                  </ChoiceButton>
                ))}
                <ChoiceButton ghost onClick={() => setChoosing(null)}>
                  Cancel
                </ChoiceButton>
              </div>
            </>
          ) : (
            <>
              <HintTitle>
                {pairLegal ? 'Tap your block to move it together.' : bornTwo ? 'Tap your yard to born.' : 'Tap a glowing man to move.'}
              </HintTitle>
              <HintBody>
                {pairLegal
                  ? 'Or tap it and pick one man to split off.'
                  : bornTwo
                    ? 'Double 6 can born two men at once.'
                  : canPick
                    ? 'Tip: tap a die first to pick which number to use.'
                    : turn.dice.length === 1 && turn.rolled.length === 2
                      ? `You have a ${turn.dice[0]} left to use.`
                      : ''}
              </HintBody>
            </>
          )}
        </HintCard>

        {testDice && playing && turn.phase === 'roll' && (
          <TestDice count={game.rules.diceMode === 'two' ? 2 : 1} onRoll={(dice) => act({ type: 'roll', dice })} />
        )}

        {view === 'play' && (
          <div style={{ fontSize: 13, fontWeight: 800, opacity: 0.8, textAlign: 'center' }}>
            Up next: {next.name} ({next.colorName} · {next.yard})
          </div>
        )}
      </div>

      {busy?.kind === 'roll' && busy.flight && <FlyingDice flight={busy.flight} />}
      {moment && (
        <MomentOverlay theme={theme} game={game} rules={game.rules} moment={moment} patois={patois} onDone={() => setMoment(null)} />
      )}
      {sheet === 'rules' && <RulesSheet theme={theme} rules={game.rules} onClose={() => setSheet(null)} />}
      {sheet === 'menu' && (
        <Menu
          theme={theme}
          patois={patois}
          muted={muted}
          onTogglePatois={onTogglePatois}
          onToggleSound={onToggleSound}
          onHome={onHome}
          onClose={() => setSheet(null)}
        />
      )}
    </Screen>
  );
}

function PlayerStrip({ theme, game, active }: { theme: Theme; game: GameState; active: Color }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${game.seats.length}, minmax(0, 1fr))`, gap: 6 }}>
      {game.seats.map((c) => {
        const s = seatInfo(theme, c, game);
        const on = c === active;
        return (
          <div
            key={c}
            aria-current={on ? 'true' : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '7px 4px',
              borderRadius: 10,
              minWidth: 0,
              ...(on
                ? {
                    background: s.paint,
                    color: CAP[c].labelInk,
                    border: `2px solid ${HIGHLIGHT}`,
                    boxShadow: '0 0 0 2px rgba(0,0,0,0.4), 0 4px 10px rgba(0,0,0,0.35)',
                  }
                : { background: 'rgba(0,0,0,0.28)', border: '2px solid rgba(255,255,255,0.08)' }),
            }}
          >
            <CapIcon color={c} fill={s.paint} size={20} ring={false} />
            <div
              style={{
                fontSize: 12,
                fontWeight: 900,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}
            >
              {s.name}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.9 }}>{s.home}/4 home</div>
          </div>
        );
      })}
    </div>
  );
}

function HintCard({ theme, children }: { theme: Theme; children: ReactNode }) {
  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.28)',
        border: `1.5px solid ${theme.trim}`,
        borderRadius: 12,
        padding: '11px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minHeight: 68,
      }}
    >
      {children}
    </div>
  );
}

const HintTitle = ({ children }: { children: ReactNode }) => <div style={{ fontSize: 15, fontWeight: 900 }}>{children}</div>;
const HintBody = ({ children }: { children: ReactNode }) =>
  children ? <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35, opacity: 0.92 }}>{children}</div> : null;

function ChoiceButton({ children, onClick, ghost }: { children: ReactNode; onClick: () => void; ghost?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        minHeight: 44,
        padding: '0 14px',
        borderRadius: 12,
        fontSize: 16,
        fontWeight: 900,
        cursor: 'pointer',
        ...(ghost
          ? { background: 'transparent', color: 'inherit', border: '2px solid rgba(255,255,255,0.25)' }
          : { background: GOLD_BUTTON, color: DARK_INK, border: `2px solid ${DARK_INK}`, boxShadow: `0 3px 0 ${DARK_INK}` }),
      }}
    >
      {children}
    </button>
  );
}

function Menu({
  theme,
  patois,
  muted,
  onTogglePatois,
  onToggleSound,
  onHome,
  onClose,
}: {
  theme: Theme;
  patois: boolean;
  muted: boolean;
  onTogglePatois: () => void;
  onToggleSound: () => void;
  onHome: () => void;
  onClose: () => void;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 30 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(12,8,5,0.55)' }} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        style={{
          position: 'absolute',
          top: 64,
          left: 16,
          right: 16,
          maxWidth: 398,
          margin: '0 auto',
          padding: 16,
          borderRadius: 16,
          background: theme.frame,
          border: `2px solid ${theme.trim}`,
          color: theme.ink,
          fontFamily: "'Nunito', system-ui, sans-serif",
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          animation: 'ludi-pop 0.15s ease-out',
        }}
      >
        <button onClick={onToggleSound} style={menuItem(theme)} aria-pressed={!muted}>
          <span>Sound</span>
          <span style={{ color: theme.callout }}>{muted ? 'Off' : 'On'}</span>
        </button>
        <button onClick={onTogglePatois} style={menuItem(theme)} aria-pressed={patois}>
          <span>Patois</span>
          <span style={{ color: theme.callout }}>{patois ? 'On' : 'Off'}</span>
        </button>
        <button onClick={onHome} style={menuItem(theme)}>
          <span>Back to start</span>
          <span style={{ fontSize: 13, opacity: 0.8 }}>Game is saved</span>
        </button>
        <PrimaryButton height={52} style={{ fontSize: 18 }} onClick={onClose}>
          Back to the game
        </PrimaryButton>
      </div>
    </div>
  );
}

const menuItem = (theme: Theme) =>
  ({
    minHeight: 52,
    padding: '0 14px',
    borderRadius: 12,
    background: 'rgba(0,0,0,0.3)',
    border: `2px solid ${theme.trim}`,
    color: 'inherit',
    fontSize: 17,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
  }) as const;

/** One sound per action, for the most important thing that happened. */
function playSounds(before: GameState, after: GameState) {
  const has = (type: string) => after.events.some((e) => e.type === type);
  if (has('noMoves')) sfx.noMoves();
  else if (after.placements.length > before.placements.length) sfx.win();
  else if (has('heaven')) sfx.heaven();
  else if (has('kill')) sfx.kill();
  else if (has('born')) sfx.born();
  else if (has('block')) sfx.block();
}

/** Dev only (?testdice): choose the dice instead of rolling, to try rules by hand. */
function TestDice({ count, onRoll }: { count: number; onRoll: (dice: number[]) => void }) {
  const [first, setFirst] = useState<number | null>(null);
  const pick = (n: number) => {
    if (count === 1) return onRoll([n]);
    if (first === null) return setFirst(n);
    setFirst(null);
    onRoll([first, n]);
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 8, borderRadius: 12, border: '2px dashed #F2C14E' }}>
      <span style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>
        Test {first === null ? '' : `${first} +`}
      </span>
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <button
          key={n}
          onClick={() => pick(n)}
          style={{ flex: 1, minHeight: 40, borderRadius: 8, border: '2px solid #1B1714', background: '#F4ECDA', fontWeight: 900, fontSize: 16 }}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
