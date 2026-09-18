import { useSyncExternalStore } from 'react';
import { GEMINI_KEY_PATTERN } from '../../shared/limits';

/**
 * A reader's own Gemini API key, for when the app's key is busy or used up. It lives in
 * sessionStorage only: this tab, forgotten when the tab closes, never sent anywhere but
 * our own API (which passes it to Google for that one request and never stores it).
 */

const STORAGE_KEY = 'clause-anatomy:geminiKey';

/** Errors a reader can get past by adding (or replacing) their own key. */
export const KEY_FIXABLE_ERRORS: ReadonlySet<string> = new Set([
  'error_ai_busy',
  'error_ai_unavailable',
  'error_ai_key_invalid',
]);

const listeners = new Set<() => void>();

const notify = (): void => listeners.forEach((listener) => listener());

export function readUserKey(): string | null {
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    return value && GEMINI_KEY_PATTERN.test(value) ? value : null;
  } catch {
    return null;
  }
}

export function isValidUserKey(value: string): boolean {
  return GEMINI_KEY_PATTERN.test(value.trim());
}

/** Saves the key for this tab. Returns false if it is not a valid key or storage is blocked. */
export function saveUserKey(value: string): boolean {
  const key = value.trim();
  if (!isValidUserKey(key)) return false;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, key);
  } catch {
    return false;
  }
  notify();
  return true;
}

export function clearUserKey(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored, or storage is blocked: either way there is no key.
  }
  notify();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether the reader has a key saved in this tab (re-renders when it changes). */
export function useHasUserKey(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => readUserKey() !== null,
    () => false,
  );
}
