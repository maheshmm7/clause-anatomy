/**
 * Tiny wrapper around localStorage for user *preferences only* (language, reading level).
 * Documents and answers are never persisted. Storage can be unavailable (private mode,
 * blocked site data), so every access is guarded and failures fall back silently.
 */
const PREFIX = 'clause-anatomy:';

export function readPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function writePreference(key: string, value: string): void {
  try {
    window.localStorage.setItem(PREFIX + key, value);
  } catch {
    // Preferences are a convenience; the app works without them.
  }
}
