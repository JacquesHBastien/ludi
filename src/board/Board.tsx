import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { HEAVEN, LANE_LENGTH, LAST_TRACK, YARD, type Color, type Progress } from '../engine';
import { CAP, GRAIN, HIGHLIGHT, SLOT_INDEX, heavenColor, type Theme } from '../theme/themes';
import { CapShape } from './Cap';
import {
  BOARD_PX,
  cellOf,
  cellRect,
  zoomBox,
  heavenRect,
  heavenSpot,
  isTopYard,
  laneRects,
  squareCenter,
  trackRects,
  yardRect,
  yardSpot,
  type GridRect,
  type Point,
} from './layout';

const SLOTS: Color[] = ['red', 'gold', 'green', 'black'];
const SIZE = { yard: 26, board: 19, heaven: 15 };
const HIT_RADIUS = 22; // 44px tap target at the mockup's scale

export interface BoardProps {
  theme: Theme;
  /** Colors in this game. Yards of other colors are painted but stay empty. */
  seats: Color[];
  men: Record<Color, Progress[]>;
  /** The color whose turn it is and the squares it can move from. Only these men glow and take taps. */
  movable?: { color: Color; froms: Progress[] };
  onTapMan?: (from: Progress) => void;
  /** Player names for screen-reader labels. */
  names?: Partial<Record<Color, string>>;
  /** Men in mid-move: hidden from `from` and drawn hopping along `path` instead. */
  moving?: Moving;
  /** Width of the dark frame around the board, in px. Small previews use a thinner frame. */
  frame?: number;
  /**
   * Zoom in on one color's turn: `spots` decide the view, `here` squares get a gold outline
   * (where his men stand) and `there` squares a dashed one (where the picked dice would land them).
   */
  focus?: Focus;
}

export interface Focus {
  color: Color;
  spots: Progress[];
  here: Progress[];
  there: Progress[];
}

export interface Moving {
  /** Changes for every move so the hop restarts. */
  id: number;
  color: Color;
  from: Progress;
  count: number;
  /** Every square passed through, ending on the landing square. */
  path: Progress[];
  stepMs: number;
  onStep?: () => void;
}

interface Piece {
  key: string;
  color: Color;
  from: Progress;
  at: Point;
  size: number;
  count: number;
  legal: boolean;
  label: string;
}

export function Board({ theme, seats, men, movable, onTapMan, names = {}, moving, frame = 9, focus }: BoardProps) {
  const id = useId();
  const glowId = `${id}glow`;
  const shadowId = `${id}shadow`;
  const shown = moving ? withoutMoving(men, moving) : men;
  const box = focus ? zoomBox(focus.color, focus.spots) : { x: 0, y: 0, size: BOARD_PX };
  const zoom = BOARD_PX / box.size;
  // Zoomed in, men shrink a little so the color of the square they stand on shows around them.
  const pieces = layoutPieces(theme, seats, shown, movable, names, zoom > 1.15 ? 15 : SIZE.board);
  // Draw legal men last so their glow and tap areas sit on top.
  const ordered = [...pieces.filter((p) => !p.legal), ...pieces.filter((p) => p.legal)];

  return (
    <div
      style={{
        backgroundColor: theme.frame,
        backgroundImage: GRAIN.dark,
        padding: frame,
        borderRadius: frame < 9 ? 6 : 8,
        boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.06), 0 8px 0 rgba(0,0,0,0.35), 0 16px 28px rgba(0,0,0,0.4)',
      }}
    >
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', overflow: 'hidden' }}>
        <div
          style={{
            ...layer,
            transformOrigin: '0 0',
            transform: `scale(${zoom}) translate(${(-box.x / BOARD_PX) * 100}%, ${(-box.y / BOARD_PX) * 100}%)`,
            transition: 'transform 0.45s ease-in-out',
          }}
        >
          <svg viewBox={`0 0 ${BOARD_PX} ${BOARD_PX}`} style={layer} aria-hidden="true">
            <Paint theme={theme} />
          </svg>
          <div
            style={{ ...layer, backgroundImage: GRAIN.board, mixBlendMode: 'multiply', opacity: 0.55, pointerEvents: 'none' }}
          />
          <svg viewBox={`0 0 ${BOARD_PX} ${BOARD_PX}`} style={{ ...layer, overflow: 'visible' }} role="group" aria-label="Ludi board">
            <defs>
              <filter id={glowId} x="-100%" y="-100%" width="300%" height="300%">
                <feDropShadow dx={0} dy={0} stdDeviation={2} floodColor={HIGHLIGHT} result="near" />
                <feDropShadow in="near" dx={0} dy={0} stdDeviation={4} floodColor={HIGHLIGHT} />
              </filter>
              <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx={0} dy={2} stdDeviation={0} floodColor="#000" floodOpacity={0.5} />
              </filter>
            </defs>
            {SLOTS.flatMap((c) =>
              [0, 1, 2, 3].map((n) => {
                const { x, y } = yardSpot(c, n);
                return <circle key={`${c}s${n}`} cx={x} cy={y} r={14} fill="rgba(0,0,0,0.22)" />;
              }),
            )}
            {focus && <SquareMarks focus={focus} />}
            {ordered.map((p) => (
              <PieceView key={p.key} piece={p} fill={theme.players[p.color]} filter={p.legal ? glowId : shadowId} />
            ))}
            {moving && <Hopper key={moving.id} moving={moving} men={men} fill={theme.players[moving.color]} filter={shadowId} />}
            {onTapMan &&
              ordered
                .filter((p) => p.legal)
                .map((p) => (
                  <circle
                    key={`${p.key}hit`}
                    cx={p.at.x}
                    cy={p.at.y}
                    r={Math.max(11, HIT_RADIUS / zoom)}
                    fill="transparent"
                    role="button"
                    tabIndex={0}
                    aria-label={p.label}
                    style={{ cursor: 'pointer', outline: 'none' }}
                    onClick={() => onTapMan(p.from)}
                    onKeyDown={(e: KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onTapMan(p.from);
                      }
                    }}
                  />
                ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

/** Gold outline on the squares the moving color's men stand on; dashed outline where they could land. */
function SquareMarks({ focus }: { focus: Focus }) {
  const outline = (p: Progress, dashed: boolean) => {
    const cell = cellOf(focus.color, p);
    if (!cell) return null;
    const { x, y, w, h } = cellRect(cell);
    return (
      <rect
        key={`${dashed ? 't' : 'h'}${p}`}
        x={x - 1}
        y={y - 1}
        width={w + 2}
        height={h + 2}
        rx={2}
        fill={dashed ? 'rgba(255,255,255,0.22)' : 'none'}
        stroke={HIGHLIGHT}
        strokeWidth={dashed ? 1.6 : 2.4}
        strokeDasharray={dashed ? '3 2' : undefined}
      />
    );
  };
  return (
    <g aria-hidden="true">
      {[...new Set(focus.there)].map((p) => outline(p, true))}
      {[...new Set(focus.here)].map((p) => outline(p, false))}
    </g>
  );
}

// Diagonal bands 0.32 wide across heaven's 4x4 box. A band meets each edge 0.16 * sqrt(2) from the corner.
const S = 0.16 * Math.SQRT2;
const SALTIRE = [
  `0,0 ${S},0 4,${4 - S} 4,4 ${4 - S},4 0,${S}`,
  `4,0 4,${S} ${S},4 0,4 0,${4 - S} ${4 - S},0`,
] as const;

/** Hide the men that are moving. Yard men vanish from the sockets the engine takes them from (lowest first). */
function withoutMoving(men: Record<Color, Progress[]>, m: Moving): Record<Color, Progress[]> {
  let left = m.count;
  const list = men[m.color].map((p) => (p === m.from && left-- > 0 ? NaN : p));
  return { ...men, [m.color]: list };
}

function pointFor(color: Color, p: Progress, men: Progress[], yardSlot: number): Point {
  if (p === YARD) return yardSpot(color, yardSlot);
  if (p === HEAVEN) {
    const home = men.filter((x) => x === HEAVEN).length;
    return heavenSpot(color, home, home + 1);
  }
  return squareCenter(color, p);
}

/** The moving man (or block) stepping from square to square. */
function Hopper({ moving, men, fill, filter }: { moving: Moving; men: Record<Color, Progress[]>; fill: string; filter: string }) {
  const [step, setStep] = useState(0);
  const { color, from, count, path, stepMs, onStep } = moving;
  useEffect(() => {
    if (step >= path.length) return;
    const t = setTimeout(() => {
      setStep((s) => s + 1);
      onStep?.();
    }, step === 0 ? 30 : stepMs);
    return () => clearTimeout(t);
  }, [step, path.length, stepMs, onStep]);

  const list = men[color];
  const points = [from, ...path].map((p) => pointFor(color, p, list, list.indexOf(from)));
  const at = points[Math.min(step, points.length - 1)]!;
  const p = path[Math.max(0, Math.min(step, path.length) - 1)] ?? from;
  const size = p === YARD ? SIZE.yard : p === HEAVEN ? SIZE.heaven : SIZE.board;
  const piece: Piece = { key: 'hop', color, from, at: { x: 0, y: 0 }, size, count, legal: false, label: '' };
  return (
    <g
      style={{ transform: `translate(${at.x}px, ${at.y}px)`, transition: `transform ${Math.min(stepMs, 160)}ms ease-out` }}
      aria-hidden="true"
    >
      {/* A slight lift while in the air. */}
      <g style={{ transform: 'scale(1.18)' }}>
        <PieceView piece={piece} fill={fill} filter={filter} />
      </g>
    </g>
  );
}

const layer = { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' } as const;

/** The painted board: yards, track, home lanes, heaven. Nothing here changes during play. */
function Paint({ theme }: { theme: Theme }) {
  const rect = (r: GridRect, fill: string, key: string) => {
    const { x, y, w, h } = cellRect(r);
    return <rect key={key} x={x} y={y} width={w} height={h} rx={1} fill={fill} />;
  };
  const heaven = cellRect(heavenRect);
  const scale = heaven.w / 4;

  return (
    <>
      <rect width={BOARD_PX} height={BOARD_PX} fill={theme.line} />
      {SLOTS.map((c) => {
        const r = cellRect(yardRect(c));
        const name = theme.yards[SLOT_INDEX[c]]!;
        const size = name.length > 12 ? 14 : 17;
        const y = isTopYard(c) ? r.y + 4 + size * 0.8 : r.y + r.h - 3 - size * 0.2;
        return (
          <g key={c}>
            {rect(yardRect(c), theme.players[c], `${c}yard`)}
            <text
              x={r.x + r.w / 2}
              y={y}
              textAnchor="middle"
              fontFamily="'Caveat Brush', cursive"
              fontSize={size}
              fill={CAP[c].labelInk}
              opacity={0.9}
            >
              {name}
            </text>
          </g>
        );
      })}
      {trackRects.map((r, i) => rect(r, theme.cycle[i % theme.cycle.length]!, `t${i}`))}
      {SLOTS.flatMap((c) =>
        laneRects(c).map((r, step) =>
          // Lane bars continue the color cycle; the bar touching heaven uses the theme's bar color.
          rect(r, step === LANE_LENGTH - 1 ? theme.bar : theme.cycle[(step + 2) % theme.cycle.length]!, `${c}l${step}`),
        ),
      )}
      <g transform={`translate(${heaven.x} ${heaven.y}) scale(${scale})`}>
        <polygon points="0,0 2,2 0,4" fill={heavenColor(theme, 'red')} />
        <polygon points="0,0 4,0 2,2" fill={heavenColor(theme, 'gold')} />
        <polygon points="4,0 4,4 2,2" fill={heavenColor(theme, 'green')} />
        <polygon points="0,4 4,4 2,2" fill={heavenColor(theme, 'black')} />
        {/* The X is drawn as two bands cut to the square, so its ends stop flush at heaven's corners. */}
        {SALTIRE.map((points) => (
          <polygon key={points} points={points} fill={theme.saltire} />
        ))}
        <circle cx={2} cy={2} r={0.78} fill={theme.cream} stroke={theme.line} strokeWidth={0.06} />
        {theme.center.map((word, i) => (
          <text
            key={word}
            x={2}
            y={1.93 + i * 0.4}
            textAnchor="middle"
            fontFamily="'Caveat Brush', cursive"
            fontSize={0.36}
            fill={theme.line}
          >
            {word}
          </text>
        ))}
      </g>
    </>
  );
}

function PieceView({ piece, fill, filter }: { piece: Piece; fill: string; filter: string }) {
  const { at, size, count, color } = piece;
  const cap = (dx: number, key: string) => (
    <g key={key} transform={`translate(${at.x - size / 2 + dx} ${at.y - size / 2 + dx}) scale(${size / 20})`}>
      <CapShape color={color} fill={fill} />
    </g>
  );
  return (
    <g filter={`url(#${filter})`} role="img" aria-label={piece.label}>
      {piece.legal && (
        // A pulsing gold ring makes movable men easy to spot even at 19px.
        <circle cx={at.x + (count > 1 ? 1.5 : 0)} cy={at.y + (count > 1 ? 1.5 : 0)} r={size / 2 + 3.5} fill="none" stroke={HIGHLIGHT} strokeWidth={2.5}>
          <animate attributeName="stroke-opacity" values="1;0.35;1" dur="1.4s" repeatCount="indefinite" />
        </circle>
      )}
      {count > 1 && cap(3, 'under')}
      {cap(0, 'top')}
      {count > 1 && (
        <g transform={`translate(${at.x + size / 2 + 0.5} ${at.y - size / 2 - 1.5})`}>
          <rect x={-7.5} y={-7.5} width={15} height={15} rx={7.5} fill={HIGHLIGHT} stroke="#1B1714" strokeWidth={1.5} />
          <text y={3.5} textAnchor="middle" fontFamily="Nunito, system-ui, sans-serif" fontWeight={900} fontSize={10} fill="#1B1714">
            {count}
          </text>
        </g>
      )}
    </g>
  );
}

function layoutPieces(
  theme: Theme,
  seats: Color[],
  men: Record<Color, Progress[]>,
  movable: BoardProps['movable'],
  names: Partial<Record<Color, string>>,
  boardSize: number,
): Piece[] {
  const out: Piece[] = [];
  for (const color of seats) {
    const who = names[color] ?? theme.colorNames[SLOT_INDEX[color]];
    const canMove = (from: Progress) => movable?.color === color && movable.froms.includes(from);
    const list = men[color];

    list.forEach((p, n) => {
      if (p !== YARD) return; // NaN (a man in mid-move) is skipped here and below
      const legal = canMove(YARD);
      out.push({
        key: `${color}y${n}`, color, from: YARD, at: yardSpot(color, n), size: SIZE.yard, count: 1, legal,
        label: `${who} man in the yard${legal ? ', can be born' : ''}`,
      });
    });

    const home = list.filter((p) => p === HEAVEN).length;
    const visible = list.filter((p) => !Number.isNaN(p));
    for (let i = 0; i < home; i++) {
      out.push({
        key: `${color}h${i}`, color, from: HEAVEN, at: heavenSpot(color, i, home), size: SIZE.heaven, count: 1, legal: false,
        label: `${who} man in heaven`,
      });
    }

    const counts = new Map<Progress, number>();
    for (const p of visible) if (p !== YARD && p !== HEAVEN) counts.set(p, (counts.get(p) ?? 0) + 1);
    for (const [p, count] of counts) {
      const legal = canMove(p);
      const what = count > 1 ? `block of ${count} men` : 'man';
      const where = p > LAST_TRACK ? 'in the home lane' : 'on the board';
      out.push({
        key: `${color}p${p}`, color, from: p, at: squareCenter(color, p), size: boardSize, count, legal,
        label: `${who} ${what} ${where}${legal ? ', can move' : ''}`,
      });
    }
  }
  return out;
}
