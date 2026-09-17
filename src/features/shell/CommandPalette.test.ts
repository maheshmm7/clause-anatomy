import { describe, expect, it, vi } from 'vitest';
import type { LoadedDocument } from '../../app/flow';
import { initialWorkspace, workspaceReducer } from '../../app/workspace';
import { formatMessage } from '../../i18n/format';
import { RENTAL_SAMPLE } from '../../samples/rental';
import { buildPaletteItems, filterPaletteItems } from './CommandPalette';

const t = (key: Parameters<typeof formatMessage>[1]) => formatMessage('en', key);
const loaded: LoadedDocument = {
  text: RENTAL_SAMPLE.text,
  analysis: RENTAL_SAMPLE.analyses.en!,
  origin: 'sample',
  redactions: 0,
  partialRead: false,
  languageFallback: false,
};

describe('command palette', () => {
  it('offers only reachable sections before a paper is open', () => {
    const items = buildPaletteItems(initialWorkspace, t, {
      go: vi.fn(),
      toggleTheme: vi.fn(),
      openSettings: vi.fn(),
      openLanding: vi.fn(),
    });
    expect(items.filter((item) => item.group === 'navigation').map((item) => item.label)).toEqual([
      'Workspace',
    ]);
    expect(items.some((item) => item.group === 'clauses')).toBe(false);
  });

  it('searches sections, clauses and legal words and runs the chosen item', () => {
    const go = vi.fn();
    const state = workspaceReducer(initialWorkspace, { type: 'addDocument', id: 'a', loaded });
    const items = buildPaletteItems(state, t, {
      go,
      toggleTheme: vi.fn(),
      openSettings: vi.fn(),
      openLanding: vi.fn(),
    });

    // Without a query: sections, first clauses and actions, but no word list.
    const browse = filterPaletteItems(items, '');
    expect(browse.some((item) => item.group === 'terms')).toBe(false);
    expect(browse.filter((item) => item.group === 'clauses')).toHaveLength(6);
    expect(browse.some((item) => item.label === 'Compare')).toBe(false);

    const results = filterPaletteItems(items, 'DEPOSIT');
    const clause = results.find((item) => item.group === 'clauses');
    expect(clause?.label).toBe('Getting your deposit back');
    clause?.run();
    expect(go).toHaveBeenCalledWith('clauses', { pointId: 'p3' });

    expect(filterPaletteItems(items, 'zzzz-nothing')).toEqual([]);
  });
});
