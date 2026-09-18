import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearUserKey, readUserKey, saveUserKey, useHasUserKey } from './userKey';

const KEY = 'test.reader.key.not-real.0123456789';

describe("the reader's own Gemini key", () => {
  beforeEach(() => window.sessionStorage.clear());

  it('is saved for this tab only (sessionStorage), trimmed', () => {
    expect(saveUserKey(`  ${KEY}\n`)).toBe(true);
    expect(readUserKey()).toBe(KEY);
    expect(window.sessionStorage.getItem('clause-anatomy:geminiKey')).toBe(KEY);
    expect(window.localStorage.getItem('clause-anatomy:geminiKey')).toBeNull();
  });

  it('refuses anything that is not shaped like a key', () => {
    for (const bad of [
      '',
      'short',
      'has spaces but is long enough to pass the length',
      'x'.repeat(200),
    ]) {
      expect(saveUserKey(bad)).toBe(false);
    }
    expect(readUserKey()).toBeNull();
    // Tampered storage is ignored too.
    window.sessionStorage.setItem('clause-anatomy:geminiKey', '<script>');
    expect(readUserKey()).toBeNull();
  });

  it('can be removed, and components follow the change', () => {
    const { result } = renderHook(() => useHasUserKey());
    expect(result.current).toBe(false);
    act(() => void saveUserKey(KEY));
    expect(result.current).toBe(true);
    act(() => clearUserKey());
    expect(result.current).toBe(false);
    expect(readUserKey()).toBeNull();
  });

  it('fails safely when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(saveUserKey(KEY)).toBe(false);
    expect(readUserKey()).toBeNull();
    expect(() => clearUserKey()).not.toThrow();
    vi.restoreAllMocks();
  });
});
