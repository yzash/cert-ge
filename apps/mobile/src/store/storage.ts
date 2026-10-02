/**
 * Two storage scopes:
 *  - shared: the "server" (Mozart + Firestore stand-in). On web this is localStorage, shared by
 *    every tab, so a phone tab, a supervisor tab and the HQ tab see one world.
 *  - device: this device's session, settings, outbox and cached snapshot. On web this is
 *    sessionStorage, so each browser tab behaves like a separate phone.
 * On Android both are AsyncStorage (single device; personas switch in-app).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

function webStore(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

async function get(kind: 'local' | 'session', key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return webStore(kind)?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  return AsyncStorage.getItem(`${kind}:${key}`);
}

async function set(kind: 'local' | 'session', key: string, value: string): Promise<boolean> {
  if (isWeb) {
    try {
      webStore(kind)?.setItem(key, value);
      return true;
    } catch {
      return false; // quota or blocked storage: keep running in memory
    }
  }
  await AsyncStorage.setItem(`${kind}:${key}`, value);
  return true;
}

async function remove(kind: 'local' | 'session', key: string) {
  if (isWeb) {
    try {
      webStore(kind)?.removeItem(key);
    } catch {
      /* ignore */
    }
    return;
  }
  await AsyncStorage.removeItem(`${kind}:${key}`);
}

export const shared = {
  get: (k: string) => get('local', k),
  set: (k: string, v: string) => set('local', k, v),
  remove: (k: string) => remove('local', k),
};
export const device = {
  get: (k: string) => get('session', k),
  set: (k: string, v: string) => set('session', k, v),
  remove: (k: string) => remove('session', k),
};

/** Subscribe to changes another tab made to the shared store (web only). */
export function onSharedChange(key: string, cb: (value: string | null) => void): () => void {
  if (!isWeb) return () => {};
  const h = (e: StorageEvent) => {
    if (e.key === key) cb(e.newValue);
  };
  window.addEventListener('storage', h);
  return () => window.removeEventListener('storage', h);
}

export const IS_WEB = isWeb;
