import type { IconName } from '../components/Icon';
import type { MessageKey } from '../i18n/messages/en';
import type { View } from './workspace';

export interface ViewMeta {
  view: View;
  number: string;
  labelKey: MessageKey;
  icon: IconName;
}

/** Editorial numbering and labels for every workspace section. */
export const VIEW_META: Record<View, ViewMeta> = {
  home: { view: 'home', number: '00', labelKey: 'navWorkspace', icon: 'grid' },
  overview: { view: 'overview', number: '01', labelKey: 'navOverview', icon: 'layers' },
  clauses: { view: 'clauses', number: '02', labelKey: 'navClauses', icon: 'list' },
  document: { view: 'document', number: '03', labelKey: 'navDocument', icon: 'document' },
  risks: { view: 'risks', number: '04', labelKey: 'navRisks', icon: 'radar' },
  whatif: { view: 'whatif', number: '05', labelKey: 'navWhatIf', icon: 'branch' },
  ask: { view: 'ask', number: '06', labelKey: 'navAsk', icon: 'chat' },
  glossary: { view: 'glossary', number: '07', labelKey: 'navGlossary', icon: 'book' },
  plan: { view: 'plan', number: '08', labelKey: 'navPlan', icon: 'checkCircle' },
  compare: { view: 'compare', number: '09', labelKey: 'navCompare', icon: 'columns' },
};

/** Sections in the phone bottom bar; the rest live in the menu drawer. */
export const MOBILE_PRIMARY_VIEWS: readonly View[] = ['overview', 'clauses', 'document', 'ask'];

/* ------------------------------ Browser history ----------------------------- */

const HISTORY_KEY = 'clauseAnatomy';

export type HistoryEntry =
  { screen: 'welcome' } | { screen: 'app'; view: View; docId: string | null };

export function readHistoryEntry(state: unknown): HistoryEntry {
  const value =
    state && typeof state === 'object' ? (state as Record<string, unknown>)[HISTORY_KEY] : null;
  if (value && typeof value === 'object' && (value as { screen?: unknown }).screen === 'app') {
    const entry = value as { view?: unknown; docId?: unknown };
    const view = typeof entry.view === 'string' ? (entry.view as View) : 'home';
    const docId = typeof entry.docId === 'string' ? entry.docId : null;
    return { screen: 'app', view: Object.hasOwn(VIEW_META, view) ? view : 'home', docId };
  }
  return { screen: 'welcome' };
}

export function writeHistoryEntry(entry: HistoryEntry, replace = false): void {
  const state = { [HISTORY_KEY]: entry };
  if (replace) window.history.replaceState(state, '');
  else window.history.pushState(state, '');
}
