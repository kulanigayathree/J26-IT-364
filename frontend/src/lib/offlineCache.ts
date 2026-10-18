/**
 * Small localStorage helpers. Used to keep the last good API response (so the C2 fisher view still
 * shows the last forecast at sea) and simple preferences such as the chosen port.
 * Storage can be unavailable (private mode, blocked site data), so every call is guarded.
 */
const PREFIX = 'ocean-ai:';

export interface Remembered<T> {
  data: T;
  savedAt: string;
}

export function remember<T>(key: string, data: T): void {
  try {
    const value: Remembered<T> = { data, savedAt: new Date().toISOString() };
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: caching is best effort.
  }
}

export function recall<T>(key: string): Remembered<T> | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as Remembered<T>) : null;
  } catch {
    return null;
  }
}
