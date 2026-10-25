import type { DiceMode } from '../engine';

/** A fair die from the browser's crypto source. The engine never rolls; the UI (or later the server) does. */
function rollDie(): number {
  const buf = new Uint32Array(1);
  // Reject the top sliver so every face is exactly equally likely.
  const limit = Math.floor(0x100000000 / 6) * 6;
  do crypto.getRandomValues(buf);
  while (buf[0]! >= limit);
  return (buf[0]! % 6) + 1;
}

export function rollDice(mode: DiceMode): number[] {
  return mode === 'two' ? [rollDie(), rollDie()] : [rollDie()];
}
