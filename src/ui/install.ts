// "Add to Home Screen" support. iPhones have no install API, so we explain the Share steps;
// Android Chrome hands us a prompt we can show from a button.
import { useEffect, useState } from 'react';

export type Platform = 'ios' | 'android' | 'other';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Chrome can fire this before React mounts, so catch it as early as the module loads.
let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

export function detectPlatform(ua: string, touchPoints = 0): Platform {
  // iPadOS reports itself as a Mac, but with a touch screen.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

/** Opened from the Home Screen (no browser bars)? Then it's already installed. */
export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

export function useInstall() {
  const [, refresh] = useState(0);
  useEffect(() => {
    const l = () => refresh((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  const platform = typeof navigator === 'undefined' ? 'other' : detectPlatform(navigator.userAgent, navigator.maxTouchPoints);
  return {
    platform,
    installed: isInstalled(),
    /** Android/desktop Chrome can show its own install prompt. */
    canPrompt: deferred !== null,
    async prompt(): Promise<boolean> {
      const e = deferred;
      if (!e) return false;
      deferred = null;
      await e.prompt();
      const choice = await e.userChoice;
      refresh((n) => n + 1);
      return choice.outcome === 'accepted';
    },
  };
}

const DISMISS_KEY = 'ludi.installHint.dismissed';

export function hintDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissHint(): void {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // ignore
  }
}
