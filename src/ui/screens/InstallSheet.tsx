import { useEffect, type ReactNode } from 'react';
import type { Platform } from '../install';
import { Icons } from '../icons';
import { DARK_INK, ROOTS, display } from '../style';

interface InstallSheetProps {
  platform: Platform;
  onClose: () => void;
}

/** Step-by-step "Add to Home Screen", with the real icons to look for. */
export function InstallSheet({ platform, onClose }: InstallSheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const steps: [ReactNode, ReactNode][] =
    platform === 'android'
      ? [
          [Icons.dots, <>Tap the <b>⋮ menu</b> at the top right of Chrome.</>],
          [Icons.addSquare, <>Tap <b>Add to Home screen</b> (it may say <b>Install app</b>).</>],
          [<Check key="c" />, <>Tap <b>Install</b> or <b>Add</b>. Ludi shows up with your other apps.</>],
        ]
      : [
          [Icons.share, <>Tap the <b>Share</b> button. In Safari it&apos;s at the bottom of the screen (top right on iPad).</>],
          [Icons.addSquare, <>Scroll down and tap <b>Add to Home Screen</b>.</>],
          [<Check key="c" />, <>Tap <b>Add</b>. Ludi shows up on your Home Screen like an app.</>],
        ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 30 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(12,8,5,0.55)' }} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add Ludi to your Home Screen"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          maxWidth: 430,
          margin: '0 auto',
          background: ROOTS.cream,
          color: DARK_INK,
          borderRadius: '22px 22px 0 0',
          boxShadow: '0 -10px 30px rgba(0,0,0,0.5)',
          padding: '12px 20px 28px',
          fontFamily: "'Nunito', system-ui, sans-serif",
          animation: 'ludi-sheet 0.2s ease-out',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 6 }} aria-hidden="true">
          <div style={{ width: 44, height: 5, borderRadius: 3, background: '#8A6A44' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <img src={`${import.meta.env.BASE_URL}apple-touch-icon.png`} alt="" width={48} height={48} style={{ borderRadius: 11 }} />
          <h2 style={{ ...display(30), margin: 0, fontWeight: 400 }}>Make Ludi an app</h2>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#3A2E22', lineHeight: 1.4, marginBottom: 6 }}>
          Opens full screen from your Home Screen, and your game is still there when you come back.
        </div>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {steps.map(([icon, text], i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderTop: '1.5px solid rgba(27,23,20,0.14)' }}>
              <span style={{ ...display(26), width: 18, textAlign: 'center' }}>{i + 1}</span>
              <span
                aria-hidden="true"
                style={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  borderRadius: 10,
                  background: '#FFFFFF',
                  border: '1.5px solid rgba(27,23,20,0.2)',
                  color: '#0A64D8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {icon}
              </span>
              <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.35 }}>{text}</span>
            </li>
          ))}
        </ol>
        {platform === 'ios' && (
          <div style={{ fontSize: 13, fontWeight: 700, color: '#4A3A28', lineHeight: 1.4, marginTop: 4 }}>
            Using Chrome on iPhone? Tap the Share button in the address bar, then Add to Home Screen.
          </div>
        )}
        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            width: '100%',
            height: 52,
            borderRadius: 14,
            border: `3px solid ${DARK_INK}`,
            background: '#E8B21C',
            color: DARK_INK,
            fontSize: 18,
            fontWeight: 900,
            boxShadow: `0 4px 0 ${DARK_INK}`,
            cursor: 'pointer',
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function Check() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}
