import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { normalizeForMatch } from '../../../shared/text';
import { VIEW_META } from '../../app/navigation';
import { DOCUMENT_VIEWS, VIEWS, type View, type WorkspaceState } from '../../app/workspace';
import { Dialog } from '../../components/Dialog';
import { Icon, type IconName } from '../../components/Icon';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages/en';
import { collectGlossary } from '../../lib/insights';

export interface PaletteItem {
  id: string;
  group: 'navigation' | 'clauses' | 'terms' | 'actions';
  label: string;
  detail?: string;
  icon: IconName;
  lang?: string;
  run: () => void;
}

const GROUP_LABELS: Record<PaletteItem['group'], MessageKey> = {
  navigation: 'paletteNavigation',
  clauses: 'paletteClauses',
  terms: 'paletteTerms',
  actions: 'paletteActions',
};

const MAX_PER_GROUP = 6;

/** Builds every searchable item from the workspace (pure apart from the callbacks). */
export function buildPaletteItems(
  state: WorkspaceState,
  t: (key: MessageKey) => string,
  handlers: {
    go: (view: View, options?: { pointId?: string }) => void;
    toggleTheme: () => void;
    openSettings: () => void;
    openLanding: () => void;
  },
): PaletteItem[] {
  const doc = state.docs.find((candidate) => candidate.id === state.activeId);
  const available = (view: View): boolean =>
    view === 'compare'
      ? state.docs.length > 1
      : !(DOCUMENT_VIEWS as readonly View[]).includes(view) || Boolean(doc);

  const navigation: PaletteItem[] = VIEWS.filter(available).map((view) => ({
    id: `view-${view}`,
    group: 'navigation',
    label: t(VIEW_META[view].labelKey),
    detail: VIEW_META[view].number,
    icon: VIEW_META[view].icon,
    run: () => handlers.go(view),
  }));

  const analysis = doc?.loaded.analysis;
  const clauses: PaletteItem[] = (analysis?.points ?? []).map((point, index) => ({
    id: `clause-${point.id}`,
    group: 'clauses',
    label: point.title,
    detail: `${String(index + 1).padStart(2, '0')}${point.sourceLabel ? ` · ${point.sourceLabel}` : ''}`,
    icon: 'list',
    lang: analysis?.language,
    run: () => handlers.go('clauses', { pointId: point.id }),
  }));

  const terms: PaletteItem[] = analysis
    ? collectGlossary(analysis.points).map((entry) => ({
        id: `term-${entry.term}`,
        group: 'terms',
        label: entry.term,
        detail: entry.meaning,
        icon: 'book',
        lang: analysis.language,
        run: () => handlers.go('glossary'),
      }))
    : [];

  const actions: PaletteItem[] = [
    {
      id: 'action-new',
      group: 'actions',
      label: t('newDocument'),
      icon: 'plus',
      run: () => handlers.go('home'),
    },
    {
      id: 'action-theme',
      group: 'actions',
      label: t('actionToggleTheme'),
      icon: 'moon',
      run: handlers.toggleTheme,
    },
    {
      id: 'action-settings',
      group: 'actions',
      label: t('actionOpenSettings'),
      icon: 'sliders',
      run: handlers.openSettings,
    },
    {
      id: 'action-landing',
      group: 'actions',
      label: t('actionHomePage'),
      icon: 'home',
      run: handlers.openLanding,
    },
  ];

  return [...navigation, ...clauses, ...terms, ...actions];
}

export function filterPaletteItems(items: readonly PaletteItem[], query: string): PaletteItem[] {
  const needle = normalizeForMatch(query);
  const matches = needle
    ? items.filter((item) =>
        normalizeForMatch(`${item.label} ${item.detail ?? ''}`).includes(needle),
      )
    : items.filter((item) => item.group !== 'terms');
  const counts = new Map<PaletteItem['group'], number>();
  return matches.filter((item) => {
    const count = counts.get(item.group) ?? 0;
    counts.set(item.group, count + 1);
    return count < MAX_PER_GROUP;
  });
}

/**
 * Ctrl/⌘ + K command palette: jump to any section, clause or legal word from anywhere.
 * WAI-ARIA combobox with a listbox; arrow keys move, Enter opens, Escape closes.
 */
export function CommandPalette({
  items,
  onClose,
}: {
  items: readonly PaletteItem[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const results = useMemo(() => filterPaletteItems(items, query), [items, query]);
  const safeActive = Math.min(active, Math.max(0, results.length - 1));

  const run = (item: PaletteItem | undefined): void => {
    if (!item) return;
    onClose();
    item.run();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((safeActive + step + results.length) % Math.max(1, results.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run(results[safeActive]);
    }
  };

  const groups = results.reduce<
    { group: PaletteItem['group']; entries: { item: PaletteItem; index: number }[] }[]
  >((all, item, index) => {
    const last = all.at(-1);
    if (last?.group === item.group) last.entries.push({ item, index });
    else all.push({ group: item.group, entries: [{ item, index }] });
    return all;
  }, []);

  return (
    <Dialog label={t('paletteTitle')} className="palette" onClose={onClose} initialFocus={inputRef}>
      <div className="palette__search">
        <Icon name="search" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            results[safeActive] ? `${listId}-${results[safeActive]?.id}` : undefined
          }
          aria-label={t('paletteTitle')}
          placeholder={t('palettePlaceholder')}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        <button type="button" className="icon-btn" onClick={onClose}>
          <Icon name="x" />
          <span className="visually-hidden">{t('close')}</span>
        </button>
      </div>
      <div id={listId} role="listbox" aria-label={t('paletteTitle')} className="palette__list">
        {results.length === 0 && <p className="palette__empty">{t('paletteEmpty')}</p>}
        {groups.map(({ group, entries }) => (
          <div
            key={group}
            role="group"
            aria-labelledby={`${listId}-${group}`}
            className="palette__groupbox"
          >
            <p id={`${listId}-${group}`} className="palette__group">
              {t(GROUP_LABELS[group])}
            </p>
            {entries.map(({ item, index }) => (
              <div
                key={item.id}
                id={`${listId}-${item.id}`}
                role="option"
                aria-selected={index === safeActive}
                tabIndex={-1}
                className="palette__item"
                onMouseEnter={() => setActive(index)}
                onClick={() => run(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') run(item);
                }}
              >
                <Icon name={item.icon} />
                <span className="palette__label" lang={item.lang}>
                  {item.label}
                </span>
                {item.detail && (
                  <span className="palette__detail" lang={item.lang}>
                    {item.detail}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="palette__hint">{t('paletteHint')}</p>
    </Dialog>
  );
}

/** The palette for the current workspace (lazy-loaded the first time search is opened). */
export function WorkspacePalette({
  state,
  handlers,
  onClose,
}: {
  state: WorkspaceState;
  handlers: Parameters<typeof buildPaletteItems>[2];
  onClose: () => void;
}) {
  const { t } = useI18n();
  return <CommandPalette items={buildPaletteItems(state, t, handlers)} onClose={onClose} />;
}
