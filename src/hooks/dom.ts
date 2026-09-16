import { useEffect, useRef, useState, type RefObject } from 'react';

/** Reactive `matchMedia`. Returns `false` where media queries are unavailable (tests, old browsers). */
export function useMediaQuery(query: string): boolean {
  const getMatch = (): boolean =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(query).matches;
  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia(query);
    const update = (): void => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);

  return matches;
}

/**
 * Moves keyboard and screen-reader focus to an element when `key` changes, so users
 * of assistive technology know the screen has changed (e.g. a new step or tab).
 */
export function useFocusOnChange<T extends HTMLElement>(key: unknown): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    ref.current?.focus();
  }, [key]);

  return ref;
}

/**
 * Whether the user has interacted with the page yet. On the very first page load we
 * must not move focus (that would skip the "Skip to main content" link); after an
 * interaction, moving focus to a new screen's heading tells assistive technology
 * that the screen changed.
 */
let userHasInteracted = false;
if (typeof window !== 'undefined') {
  const markInteracted = (): void => {
    userHasInteracted = true;
  };
  window.addEventListener('pointerdown', markInteracted, { once: true, capture: true });
  window.addEventListener('keydown', markInteracted, { once: true, capture: true });
}

/** Focuses the element when it mounts, once the user has started interacting. */
export function useFocusOnMount<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (userHasInteracted) ref.current?.focus();
  }, []);
  return ref;
}
