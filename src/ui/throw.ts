/** Throw power from how long the dice were shaken: a quick tap is a soft lob, about 1.3s is a full slam. */
export function shakePower(heldMs: number): number {
  return Math.min(1.5, Math.max(0.3, 0.3 + heldMs / 1100));
}
