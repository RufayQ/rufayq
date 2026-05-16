/**
 * Native bridge — thin abstraction over Capacitor plugins.
 *
 * Why this exists:
 *   The Rufayq web bundle runs in three places (browser preview, Capacitor
 *   Android, Capacitor iOS). Importing Capacitor plugins directly from
 *   feature code would crash the browser build because the native shims
 *   are unavailable. This module exposes a small, typed API that:
 *
 *     1. Detects the runtime via `Capacitor.isNativePlatform()`.
 *     2. Calls the native plugin when running inside a shell.
 *     3. Falls back to a sensible web behaviour otherwise.
 *
 * Add new capabilities here rather than importing `@capacitor/*` from
 * feature folders.
 */
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import { Network } from '@capacitor/network';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'web' | 'ios' | 'android'

/** Subtle haptic tap. Native: light impact. Web: no-op. */
export async function hapticTap(): Promise<void> {
  if (!isNative) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* ignore — haptics unavailable on this device */
  }
}

/** Persistent key/value storage. Native: Preferences. Web: localStorage. */
export const storage = {
  async get(key: string): Promise<string | null> {
    if (isNative) return (await Preferences.get({ key })).value;
    return localStorage.getItem(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (isNative) return Preferences.set({ key, value });
    localStorage.setItem(key, value);
  },
  async remove(key: string): Promise<void> {
    if (isNative) return Preferences.remove({ key });
    localStorage.removeItem(key);
  },
};

/** Share text or a file URL. Native: system share sheet. Web: Web Share API → clipboard. */
export async function shareContent(opts: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<void> {
  if (isNative) {
    await Share.share(opts);
    return;
  }
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share(opts);
      return;
    } catch {
      /* fall through to clipboard */
    }
  }
  if (opts.url || opts.text) {
    await navigator.clipboard?.writeText(opts.url ?? opts.text ?? '');
  }
}

/** Subscribe to network connectivity changes. Returns an unsubscribe fn. */
export async function onNetworkChange(
  cb: (online: boolean) => void,
): Promise<() => void> {
  if (isNative) {
    const handle = await Network.addListener('networkStatusChange', (s) =>
      cb(s.connected),
    );
    return () => handle.remove();
  }
  const listener = () => cb(navigator.onLine);
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
}
