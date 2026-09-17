import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Sections and dialogs are lazy-loaded chunks; allow for slower machines under coverage.
configure({ asyncUtilTimeout: 4000 });

// jsdom does not implement layout APIs that real browsers provide.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}
if (typeof window !== 'undefined') {
  window.scrollTo = () => undefined;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.localStorage.clear();
});
