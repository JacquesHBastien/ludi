import type { Color } from '../engine';
import { CAP, SHAPES } from '../theme/themes';

interface CapProps {
  color: Color;
  /** The theme's paint for this color slot. */
  fill: string;
  /** Detailed caps have the inner ring; small ones (chips, buttons) skip it. */
  ring?: boolean;
}

/** A bottle cap in a 20x20 box: crimped edge, inner ring, the player's shape in the middle. */
export function CapShape({ color, fill, ring = true }: CapProps) {
  const { edge, markFill } = CAP[color];
  return (
    <>
      <circle cx={10} cy={10} r={ring ? 8.7 : 8.6} fill={fill} stroke={edge} strokeWidth={ring ? 2.4 : 2.2} strokeDasharray="1.5 1.1" />
      {ring && <circle cx={10} cy={10} r={6.2} fill="none" stroke={edge} strokeOpacity={0.55} strokeWidth={0.8} />}
      {/* A bigger, outlined shape so color is never the only clue. */}
      <path
        transform="translate(4 4) scale(0.6)"
        d={SHAPES[color].markPath}
        fill={markFill}
        stroke={color === 'gold' ? '#F4E9D4' : '#1B1714'}
        strokeOpacity={0.6}
        strokeWidth={1.4}
        strokeLinejoin="round"
        paintOrder="stroke"
      />
    </>
  );
}

/** A standalone cap icon for use outside the board. */
export function CapIcon({ size = 20, ...props }: CapProps & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" style={{ display: 'block' }}>
      <CapShape {...props} />
    </svg>
  );
}
