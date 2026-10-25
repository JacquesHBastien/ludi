// Shared building blocks for the screens, rebuilt from the mockups' inline styles.
import type { CSSProperties, ReactNode } from 'react';
import { GRAIN, type Theme } from '../theme/themes';
import { DARK_INK, GOLD_BUTTON, ROOTS } from './style';

export function Screen({
  theme = ROOTS,
  padding = '14px 16px 18px',
  gap = 12,
  children,
  style,
}: {
  theme?: Theme;
  padding?: string;
  gap?: number;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{ minHeight: '100dvh', backgroundColor: theme.table, backgroundImage: GRAIN.dark, color: theme.ink }}>
      <div
        style={{
          maxWidth: 430,
          minHeight: '100dvh',
          margin: '0 auto',
          fontFamily: "'Nunito', system-ui, sans-serif",
          display: 'flex',
          flexDirection: 'column',
          padding,
          gap,
          position: 'relative',
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  height = 64,
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  height?: number;
  style?: CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height,
        borderRadius: 16,
        background: GOLD_BUTTON,
        color: DARK_INK,
        border: `3px solid ${DARK_INK}`,
        boxShadow: `0 6px 0 ${DARK_INK}`,
        fontSize: 21,
        fontWeight: 900,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '0 18px',
        opacity: disabled ? 0.45 : 1,
        width: '100%',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
  trim = ROOTS.trim,
  height = 60,
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  trim?: string;
  height?: number;
  style?: CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height,
        borderRadius: 16,
        background: 'rgba(0,0,0,0.3)',
        color: 'inherit',
        border: `2px solid ${trim}`,
        fontSize: 19,
        fontWeight: 800,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '0 16px',
        opacity: disabled ? 0.5 : 1,
        width: '100%',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  onClick,
  trim = ROOTS.trim,
  children,
}: {
  label: string;
  onClick: () => void;
  trim?: string;
  children: ReactNode;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      style={{
        width: 44,
        height: 44,
        flexShrink: 0,
        borderRadius: 10,
        border: `2px solid ${trim}`,
        background: 'rgba(0,0,0,0.25)',
        color: 'inherit',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}

/** The red, gold and green bars used as an ornament above titles. */
export function Ornament({ theme = ROOTS, width = 40, height = 6 }: { theme?: Theme; width?: number; height?: number }) {
  return (
    <div style={{ display: 'flex', gap: 4 }} aria-hidden="true">
      {(['red', 'gold', 'green'] as const).map((c) => (
        <div key={c} style={{ width, height, borderRadius: Math.min(width, height) / 2, background: theme.players[c] }} />
      ))}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 1.5, textTransform: 'uppercase', opacity: 0.8 }}>
      {children}
    </div>
  );
}

