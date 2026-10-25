import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Board, type Focus, type Moving } from '../../board/Board';
import { CapIcon } from '../../board/Cap';
import { HEAVEN, YARD, applyAction, legalMoves, statsOf, trackIndexOf, type Color, type GameEvent, type GameState, type Move, type Progress } from '../../engine';
import { CAP, HIGHLIGHT, THEME_IDS, getTheme, type Theme, type ThemeId } from '../../theme/themes';
import { copy } from '../copy';
import { DiceTray, type DieView } from '../Dice';
import { FlyingDice, type Flight } from '../FlyingDice';
import { IconButton, PrimaryButton, Screen } from '../kit';
import { Icons } from '../icons';
import { display, seatInfo } from '../style';
import { rollDice } from '../random';
import { chooseMove } from '../../ai/bot';
import { bounties, bountyKills, pickTaunt, rivalry } from '../compete';
import { sfx } from '../sound';
import { landing, nextColor, pickMoment, planTap, tapTargets, usableDice, usedFlags, type Moment } from '../turn';
import { GameOver } from './GameOver';
import { Handoff } from './Handoff';
import { MomentOverlay } from './MomentOverlay';
import { RulesSheet } from './RulesSheet';

interface GameProps {
  game: GameState;
  theme: Theme;
  patois: boolean;
  muted: boolean;
  closeUp: boolean;
  onToggleCloseUp: () => void;
  /** Dev only: lets the tester choose the dice. */
  testDice?: boolean;
  onChange: (game: GameState) => void;
  onTogglePatois: () => void;
  onToggleSound: () => void;
  onChangeTheme: (id: ThemeId) => void;
  onHome: () => void;
  onPlayAgain: () => void;
}

type View = 'handoff' | 'play' | 'turnOver';

/** How long the dice spend flying over the board: a soft lob is quick, a hard shake flies longer. */
const flightMs = (power: number) => Math.min(2400, Math.max(1000, 1000 + 850 * power));

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Game(props: GameProps) {
  const { game, theme, patois, muted, closeUp, onToggleCloseUp, testDice, onChange, onTogglePatois, onToggleSound, onChangeTheme, onHome, onPlayAgain } = props;
  const levelOf = (c: Color) => game.players.find((p) => p.color === c)?.computer;
  const people = game.players.filter((p) => !p.computer);
  // Pass-the-phone only matters with two or more people; computers never get the handoff screen.
  const [view, setView] = useState<View>(() => (people.length <= 1 || levelOf(game.turn.color) ? 'play' : 'handoff'));
  /** The last person (not computer) who played, so we only hand the phone over when it changes hands. */
  const [lastPerson, setLastPerson] = useState<Color | null>(() => (levelOf(game.turn.color) ? null : game.turn.color));
  const [doneBy, setDoneBy] = useState<Color | null>(null);
  const [lastRoll, setLastRoll] = useState<{ color: Color; dice: number[]; noMoves: boolean } | null>(null);
  /** Dice the player has tapped, as indexes into turn.rolled. A man is tapped after. */
  const [picked, setPicked] = useState<number[]>([]);
  /** Colors that have already had their "Yuh born!" moment; after the first, born is just a sound. */
  const [bornSeen, setBornSeen] = useState(() => new Set(game.seats.filter((c) => game.men[c].some((p) => p !== YARD))));
  const [moment, setMoment] = useState<Moment | null>(null);
  const [results, setResults] = useState(game.status === 'over');
  const [sheet, setSheet] = useState<'rules' | 'menu' | null>(null);
  /** A roll or move is animating; the engine result is applied when it lands. */
  const [busy, setBusy] = useState<{ kind: 'roll'; flight: Flight | null } | { kind: 'move'; moving: Moving } | null>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastTaunt = useRef<string | null>(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const t = copy(patois);
  const { turn } = game;
  const legal = legalMoves(game);

  function roll(dice: number[], power = 1) {
    if (busy) return;
    const before = game;
    const after = applyAction(before, { type: 'roll', dice });
    setPicked([]);
    if (reducedMotion()) {
      sfx.roll();
      return settle(before, after, after.events);
    }
    const tray = trayRef.current?.getBoundingClientRect();
    const board = boardRef.current?.getBoundingClientRect();
    const duration = flightMs(power);
    const flight = tray && board ? { values: dice, tray, board, duration, power } : null;
    sfx.roll(duration / 1000);
    setBusy({ kind: 'roll', flight });
    timer.current = setTimeout(() => settle(before, after, after.events), duration);
  }

  /** Play one move, or two on the same man (both dice), as a single hop. */
  function move(moves: Move[]) {
    if (busy || moves.length === 0) return;
    const before = game;
    let after = before;
    const events: GameEvent[] = [];
    for (const m of moves) {
      after = applyAction(after, { type: 'move', move: m });
      events.push(...after.events);
    }
    setPicked([]);
    const from = moves[0]!.from;
    const to = landing(moves);
    const path = from === YARD ? Array.from({ length: to + 1 }, (_, i) => i) : Array.from({ length: to - from }, (_, i) => from + 1 + i);
    if (reducedMotion()) return settle(before, after, events);
    const stepMs = path.length > 8 ? 85 : 120;
    const count = moves[0]!.kind === 'pair' ? 2 : 1;
    const moving: Moving = { id: Date.now(), color: before.turn.color, from, count, path, stepMs, onStep: sfx.step };
    setBusy({ kind: 'move', moving });
    timer.current = setTimeout(() => settle(before, after, events), 30 + path.length * stepMs + 90);
  }

  /** Apply the result once its animation has landed. `events` covers every step of a chained move. */
  function settle(before: GameState, after: GameState, events: GameEvent[]) {
    setBusy(null);
    onChange(after);
    const seen = { ...after, events };
    playSounds(before, seen);

    const rolled = events.find((e) => e.type === 'rolled');
    if (rolled) setLastRoll({ color: rolled.color, dice: rolled.dice, noMoves: events.some((e) => e.type === 'noMoves') });
    let m = pickMoment(seen, before.turn.color);
    if (m?.kind === 'born') {
      if (bornSeen.has(m.color)) m = null;
      else setBornSeen(new Set([...bornSeen, m.color]));
    }
    if (m?.kind === 'kill') {
      // Was the man killed carrying a bounty? Check the position before the move.
      const kill = events.find((e) => e.type === 'kill');
      const bounty =
        kill?.type === 'kill' && bounties(before).some((b) => b.color === kill.victim && trackIndexOf(b.color, b.from) === kill.trackIndex);
      const taunt = pickTaunt(patois, lastTaunt.current);
      lastTaunt.current = taunt;
      m = { ...m, bounty, taunt };
    }
    setMoment(m);

    const firstWinner = before.placements.length === 0 && after.placements.length > 0;
    if (after.status === 'over' || firstWinner) setResults(true);
    if (after.status === 'playing' && after.turn.color !== before.turn.color) {
      const actor = before.turn.color;
      const nextUp = after.turn.color;
      const holder = levelOf(actor) ? lastPerson : actor;
      if (!levelOf(actor)) setLastPerson(actor);
      setDoneBy(actor);
      // Hand the phone over only when the next player is a different person.
      setView(!levelOf(nextUp) && people.length > 1 && nextUp !== holder ? 'turnOver' : 'play');
    }
  }

  // Computers roll, pick a die (so you can see it), and move, at a pace you can follow.
  const botLevel = levelOf(turn.color);
  useEffect(() => {
    if (!botLevel || view !== 'play' || busy || moment || results || game.status !== 'playing') return;
    if (game.turn.phase === 'roll') {
      // Computers give the cup a medium shake.
      const t = setTimeout(() => roll(rollDice(game.rules.diceMode), 0.6 + Math.random() * 0.5), 900);
      return () => clearTimeout(t);
    }
    const m = chooseMove(game, botLevel);
    const used = usedFlags(game.turn.rolled, game.turn.dice);
    const free = game.turn.rolled.flatMap((d, i) => (!used[i] && d === m.die ? [i] : []));
    const t1 = setTimeout(() => setPicked(m.kind === 'pair' ? free.slice(0, 2) : free.slice(0, 1)), 450);
    const t2 = setTimeout(() => move([m]), 1150);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // roll and move are recreated every render; the effect re-runs on every state change anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, view, busy, moment, results, botLevel]);

  // A computer's big moments clear themselves so its turn keeps going.
  useEffect(() => {
    if (!moment || !levelOf(moment.color)) return;
    const t = setTimeout(() => setMoment(null), moment.kind === 'kill' ? 2200 : 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moment]);

  /** A line to fire someone up at the start of their turn: their bounty, a grudge, or a bounty to chase. */
  function turnNote(color: Color): string | null {
    const name = (c: Color) => seatInfo(theme, c, game).name;
    const hunted = bounties(game);
    if (hunted.some((b) => b.color === color)) return t.bountyMine;
    const r = rivalry(game, color);
    if (r) return r.kind === 'hunted' ? t.hunted(name(r.other), r.count) : t.hunter(name(r.other), r.count);
    const target = hunted.find((b) => b.color !== color);
    return target ? t.bountyWatch(name(target.color)) : null;
  }

  // --- Screens that replace the board ---------------------------------------------------------

  if (results && !moment) {
    const canContinue = game.status === 'playing';
    return (
      <GameOver
        theme={theme}
        game={game}
        patois={patois}
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
        note={turnNote(game.turn.color)}
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
  const playing = view === 'play' && !busy && !botLevel;

  // Die first, then the man. With only one die that can move anything, it is picked for you.
  const moving = turn.phase === 'move' && view === 'play';
  const usable = moving ? usableDice(game) : [];
  const pickedIdx = picked.filter((i) => usable.includes(i));
  const chosen = pickedIdx.length === 0 && usable.length === 1 ? usable : pickedIdx;
  const chosenValues = chosen.map((i) => turn.rolled[i]!);
  const targets = moving ? tapTargets(game, chosenValues) : [];
  const movable = playing ? targets.map((t) => t.from) : [];
  // A block on the board that can move together, versus a double 6 that can born two men.
  const pairLegal = legal.some((m) => m.kind === 'pair' && m.from !== YARD);
  const bornTwo = legal.some((m) => m.kind === 'pair' && m.from === YARD);

  // Zoom in on this player's men and everywhere they could go while choosing a move.
  // Close-up keeps the zoom on for the whole turn (rolling too) and goes in tighter.
  const ownOut = game.men[turn.color].filter((p) => p !== HEAVEN && p !== YARD);
  const focus: Focus | undefined = moving
    ? {
        color: turn.color,
        // Close-up frames just your men and the picked die's landings; the auto zoom fits every possible landing.
        spots: closeUp
          ? [...legal.map((m) => m.from), ...targets.map((t) => t.to)]
          : [...legal.map((m) => m.from), ...legal.map((m) => landing([m])), ...tapTargets(game, turn.dice).map((t) => t.to)],
        here: legal.map((m) => m.from),
        there: targets.map((t) => t.to),
        tight: closeUp,
      }
    : closeUp && view === 'play'
      ? { color: turn.color, spots: ownOut.length ? ownOut : [YARD], here: ownOut, there: [], tight: true }
      : undefined;

  const togglePick = (i: number) => {
    if (!usable.includes(i)) return;
    setPicked(chosen.includes(i) ? chosen.filter((x) => x !== i) : [...chosen, i]);
  };
  const tapMan = (from: Progress) => {
    if (busy) return;
    const plan = planTap(game, from, chosenValues);
    if (plan) move(plan);
  };
  /** Tapping a dashed landing square makes the move that lands there. */
  const tapSquare = (to: Progress) => {
    const target = targets.find((t) => t.to === to);
    if (target) tapMan(target.from);
  };

  let dice: DieView[];
  if (view === 'turnOver' && lastRoll) dice = lastRoll.dice.map((value) => ({ value, used: true }));
  else if (turn.phase === 'roll') dice = Array.from({ length: game.rules.diceMode === 'two' ? 2 : 1 }, () => ({ value: null }));
  else {
    const used = usedFlags(turn.rolled, turn.dice);
    dice = turn.rolled.map((value, i) => ({ value, used: used[i] || (!usable.includes(i) && moving), selected: chosen.includes(i) }));
  }
  const canPick = playing && moving && usable.length > 1;

  const isDouble = turn.phase === 'move' && turn.rolled.length === 2 && turn.rolled[0] === turn.rolled[1];
  const shout = playing && isDouble ? t.double(turn.rolled[0]!, pairLegal) : '';

  return (
    <Screen theme={theme} padding="12px 10px 16px">
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

      <div ref={boardRef} style={{ width: '100%', alignSelf: 'center', position: 'relative' }}>
        <Board
          theme={theme}
          seats={game.seats}
          men={game.men}
          movable={{ color: turn.color, froms: movable }}
          onTapMan={playing ? tapMan : undefined}
          names={Object.fromEntries(game.players.map((p) => [p.color, p.name]))}
          moving={busy?.kind === 'move' ? busy.moving : undefined}
          focus={focus}
          onTapSquare={playing ? tapSquare : undefined}
          active={view === 'play' ? turn.color : undefined}
          bounties={bounties(game)}
        />
        <button
          onClick={onToggleCloseUp}
          aria-pressed={closeUp}
          aria-label={closeUp ? 'Close-up on: show the whole board while rolling' : 'Close-up: zoom in on your men'}
          style={{
            position: 'absolute',
            right: -4,
            bottom: -4,
            width: 44,
            height: 44,
            borderRadius: 22,
            border: `2px solid ${closeUp ? HIGHLIGHT : theme.trim}`,
            background: closeUp ? HIGHLIGHT : theme.frame,
            color: closeUp ? '#1B1714' : theme.ink,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 3px 8px rgba(0,0,0,0.5)',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {closeUp ? Icons.zoomOut : Icons.zoomIn}
        </button>
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
              onThrow={playing && turn.phase === 'roll' ? (power) => roll(rollDice(game.rules.diceMode), power) : undefined}
              onPick={canPick ? togglePick : undefined}
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
          ) : botLevel ? (
            <>
              <HintTitle>{busy?.kind === 'roll' ? 'Rolling…' : `${me.name} is thinking…`}</HintTitle>
              <HintBody>
                {lastRoll?.noMoves && lastRoll.color !== turn.color
                  ? `${seatInfo(theme, lastRoll.color, game).name} couldn't move with ${lastRoll.dice.join(' + ')}.`
                  : `Computer · ${botLevel[0]!.toUpperCase()}${botLevel.slice(1)}`}
              </HintBody>
            </>
          ) : turn.phase === 'roll' ? (
            <>
              <HintTitle>
                {busy?.kind === 'roll'
                  ? 'Rolling…'
                  : lastRoll?.color === turn.color && lastRoll.dice.includes(6)
                    ? 'Six! Roll again.'
                    : 'Hold the dice to shake them, then let go.'}
              </HintTitle>
              <HintBody>
                {lastRoll?.color === turn.color && lastRoll.noMoves
                  ? 'No man could move that time, but the 6 gives you another roll.'
                  : turnNote(turn.color) ??
                    (game.men[turn.color].every((p) => p === YARD || p === HEAVEN)
                      ? 'You need a 6 to born a man.'
                      : 'Then tap a die, and the man it moves.')}
              </HintBody>
            </>
          ) : (
            <MoveHint
              bounty={(() => {
                const k = bountyKills(game, legal)[0];
                if (!k) return null;
                const victim = bounties(game).find((b) => b.color !== turn.color && trackIndexOf(b.color, b.from) === trackIndexOf(turn.color, landing([k])));
                return victim ? t.bountyHunt(seatInfo(theme, victim.color, game).name) : null;
              })()}
              chosen={chosenValues}
              left={usable.length}
              targets={targets.length}
              pairLegal={pairLegal}
              bornTwo={bornTwo}
              yardReady={targets.some((x) => x.from === YARD)}
            />
          )}
        </HintCard>

        {testDice && playing && turn.phase === 'roll' && (
          <TestDice count={game.rules.diceMode === 'two' ? 2 : 1} onRoll={roll} />
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
          onChangeTheme={onChangeTheme}
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
              position: 'relative',
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
            {statsOf(game).kills[c] > 0 && (
              <span
                aria-label={`${statsOf(game).kills[c]} kills`}
                style={{
                  position: 'absolute',
                  top: -7,
                  left: -4,
                  padding: '1px 6px',
                  borderRadius: 999,
                  background: '#B5232A',
                  color: '#F4E9D4',
                  border: '1.5px solid #1B1714',
                  fontSize: 11,
                  fontWeight: 900,
                  lineHeight: '15px',
                }}
              >
                ☠ {statsOf(game).kills[c]}
              </span>
            )}
            {game.players.find((p) => p.color === c)?.computer && (
              <span
                title="Computer"
                aria-label="Computer"
                style={{ position: 'absolute', top: 3, right: 4, transform: 'scale(0.6)', transformOrigin: 'top right', opacity: 0.85 }}
              >
                {Icons.computer}
              </span>
            )}
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

/** What to do next while choosing a move: pick a die, then a man. */
function MoveHint({
  bounty,
  chosen,
  left,
  targets,
  pairLegal,
  bornTwo,
  yardReady,
}: {
  bounty: string | null;
  chosen: number[];
  left: number;
  targets: number;
  pairLegal: boolean;
  bornTwo: boolean;
  yardReady: boolean;
}) {
  if (chosen.length === 0) {
    return (
      <>
        <HintTitle>Tap a die, then the man it moves.</HintTitle>
        <HintBody>
          {bounty
            ? `🎯 ${bounty}`
            : pairLegal
            ? 'Tap both dice, then your block, to move it together.'
            : bornTwo
              ? 'Tap both sixes, then your yard, to born two men.'
              : left > 1
                ? 'Tap both dice to move one man by both.'
                : ''}
        </HintBody>
      </>
    );
  }
  if (targets === 0) {
    return (
      <>
        <HintTitle>No man can take {chosen.join(' + ')}.</HintTitle>
        <HintBody>Tap a die to unpick it and try one.</HintBody>
      </>
    );
  }
  const total = chosen.length === 2 ? `${chosen[0]} + ${chosen[1]}` : String(chosen[0]);
  return (
    <>
      <HintTitle>
        {yardReady && chosen.every((d) => d === 6)
          ? chosen.length === 2
            ? 'Tap your yard to born two men.'
            : 'Tap your yard to born a man, or a man to move him 6.'
          : pairLegal && chosen.length === 2
            ? 'Tap your block to move it together.'
            : `Now tap a man to move him ${total}.`}
      </HintTitle>
      <HintBody>
        Or tap the dashed square to land there.{chosen.length === 1 && left > 1 ? ' Tap the other die too to use both.' : ''}
      </HintBody>
    </>
  );
}

function Menu({
  theme,
  onChangeTheme,
  patois,
  muted,
  onTogglePatois,
  onToggleSound,
  onHome,
  onClose,
}: {
  theme: Theme;
  onChangeTheme: (id: ThemeId) => void;
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
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5, textTransform: 'uppercase', opacity: 0.8 }}>Board</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {THEME_IDS.map((id) => {
            const t = getTheme(id);
            const on = id === theme.id;
            return (
              <button
                key={id}
                onClick={() => onChangeTheme(id)}
                aria-pressed={on}
                style={{
                  minHeight: 48,
                  padding: '6px 8px',
                  borderRadius: 10,
                  background: 'rgba(0,0,0,0.3)',
                  border: `2px solid ${on ? HIGHLIGHT : 'rgba(255,255,255,0.12)'}`,
                  color: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', gap: 2, height: 10, width: '100%' }} aria-hidden="true">
                  {t.cycle.map((c, i) => (
                    <div key={i} style={{ flex: 1, background: c, borderRadius: 2 }} />
                  ))}
                </div>
                <span style={{ fontSize: 13, fontWeight: 900 }}>{t.name.replace(/ Edition$/, '')}</span>
              </button>
            );
          })}
        </div>
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
  else if (has('kill')) {
    sfx.kill();
    try {
      navigator.vibrate?.([60, 40, 140]); // Android only; iPhones don't let pages vibrate
    } catch {
      // ignore
    }
  }
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
