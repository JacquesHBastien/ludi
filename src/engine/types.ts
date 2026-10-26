export type Color = 'red' | 'gold' | 'green' | 'black';

export type DiceMode = 'two' | 'one';

export interface Rules {
  diceMode: DiceMode;
  heavenless: boolean;
}

export type BotLevel = 'easy' | 'medium' | 'hard';

export interface Player {
  id: string;
  name: string;
  /** Each player has one color. Two players sit diagonally (red/green or gold/black). */
  color: Color;
  /** Set for a computer player. The engine ignores it; the UI plays its turns. */
  computer?: BotLevel;
}

/**
 * A man's position is his progress along his own path:
 *   -1        yard
 *   0..46     main track (0 = his start square, one into his arm; 46 = his long crossing bar)
 *   47..51    his home lane (safe)
 *   52        heaven
 * The exact numbers come from board-geometry.json (see LAST_TRACK, LANE_START, HEAVEN).
 */
export type Progress = number;

export type Move =
  /** One man moves by one die. From the yard (from = -1) this is a born, and needs a 6. */
  | { kind: 'single'; from: Progress; die: number }
  /** Two men on the same square move together by a double, using both dice. */
  | { kind: 'pair'; from: Progress; die: number };

export type Action = { type: 'roll'; dice: number[] } | { type: 'move'; move: Move };

export type GameEvent =
  | { type: 'rolled'; color: Color; dice: number[] }
  | { type: 'noMoves'; color: Color }
  | { type: 'born'; color: Color; count: number }
  | { type: 'kill'; color: Color; victim: Color; count: number; trackIndex: number }
  | { type: 'block'; color: Color; trackIndex: number; count: number }
  | { type: 'heaven'; color: Color; count: number }
  | { type: 'finished'; playerId: string; place: number }
  | { type: 'gameOver'; result: GameResult };

export type GameResult = { kind: 'placed'; placements: string[] } | { kind: 'draw' };

export interface Turn {
  /** Index into `seats`. */
  seat: number;
  color: Color;
  phase: 'roll' | 'move';
  /** Dice still to be used this roll. */
  dice: number[];
  /** The dice as rolled. */
  rolled: number[];
  /** A 6 was rolled, so this color rolls again once the dice are used up. */
  extraRoll: boolean;
  /**
   * A man who killed with one die stays put for the rest of this roll: `count` men on `from`
   * can't move again until the next roll.
   */
  stuck?: { from: Progress; count: number };
}

export interface GameState {
  /** Bumped when the meaning of saved positions changes. 2: born one square into the arm. */
  version: 2;
  rules: Rules;
  players: Player[];
  /** Colors in play, in turn order. */
  seats: Color[];
  /** Progress of each color's 4 men. Colors not in play have an empty list. */
  men: Record<Color, Progress[]>;
  turn: Turn;
  /** Player ids in the order they got all their men to heaven. */
  placements: string[];
  status: 'playing' | 'over';
  result: GameResult | null;
  /** What happened during the last action, for the UI's big moments and sounds. */
  events: GameEvent[];
  /** Running tallies for the kill count, rivalries and end-of-game awards. */
  stats: GameStats;
}

export interface GameStats {
  /** Men each color has killed. */
  kills: Record<Color, number>;
  /** Times each color has had a man killed (a block counts each man). */
  killed: Record<Color, number>;
  /** killsBy[killer][victim]: men the killer has sent home, per victim. */
  killsBy: Record<Color, Partial<Record<Color, number>>>;
  /**
   * lastKiller[victim]: the color that most recently killed one of victim's men, until the victim
   * pays them back. Killing your lastKiller is a revenge kill. Missing in games saved before it existed.
   */
  lastKiller?: Partial<Record<Color, Color>>;
  /** Dice that came up 6, and dice rolled, per color. */
  sixes: Record<Color, number>;
  dice: Record<Color, number>;
}

export interface GameSetup {
  players: Player[];
  rules?: Partial<Rules>;
  /** Which color rolls first. Defaults to the first seat in board order. */
  firstColor?: Color;
}
