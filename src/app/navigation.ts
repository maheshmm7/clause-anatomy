import type { IconName } from '../components/Icon';
import type { MessageKey } from '../i18n/messages/en';
import { LEGAL_PAGES, type LegalPage } from '../i18n/legalPages';
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

/* ---------------------------------- Routes ---------------------------------- */

/**
 * Pages live in the URL hash (`#/`, `#/privacy`, `#/workspace/clauses`) so refresh,
 * Back/Forward and shared links work on any static host without server rewrites.
 * The open paper's id rides in `history.state`: papers are never put in the URL.
 */
export type Route =
  { page: 'landing' } | { page: 'legal'; doc: LegalPage } | { page: 'app'; view: View };

const WORKSPACE = 'workspace';

export function parseRoute(hash: string): Route {
  const [first = '', second = ''] = hash.replace(/^#\/?/, '').split('/');
  if (first === WORKSPACE) {
    return { page: 'app', view: Object.hasOwn(VIEW_META, second) ? (second as View) : 'home' };
  }
  if ((LEGAL_PAGES as readonly string[]).includes(first)) {
    return { page: 'legal', doc: first as LegalPage };
  }
  return { page: 'landing' };
}

export function routeToHash(route: Route): string {
  if (route.page === 'app') {
    return route.view === 'home' ? `#/${WORKSPACE}` : `#/${WORKSPACE}/${route.view}`;
  }
  return route.page === 'legal' ? `#/${route.doc}` : '#/';
}

const DOC_KEY = 'clauseAnatomyDoc';

export function readRouteDocId(state: unknown): string | null {
  const value =
    state && typeof state === 'object' ? (state as Record<string, unknown>)[DOC_KEY] : null;
  return typeof value === 'string' ? value : null;
}

export function writeRoute(route: Route, docId: string | null = null, replace = false): void {
  const state = { [DOC_KEY]: docId };
  const url = routeToHash(route);
  if (replace) window.history.replaceState(state, '', url);
  else window.history.pushState(state, '', url);
}
