import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { isUiLanguage, type ExplanationLanguage } from '../../shared/languages';
import { ApiClientError, api } from '../api/client';
import { Spinner } from '../components/ui';
import { LandingPage } from '../features/site/LandingPage';
import { SpeechProvider } from '../hooks/speech';
import { hasMessages, loadMessages } from '../i18n/format';
import { I18nProvider, useI18n } from '../i18n/I18nProvider';
import { LEGAL_TITLE_KEYS } from '../i18n/legalPages';
import type { MessageKey } from '../i18n/messages/en';
import { useHasUserKey } from '../lib/userKey';
import { useSettings } from '../settings/SettingsProvider';
import type { LoadedDocument } from './flow';
import { parseRoute, readRouteDocId, VIEW_META, writeRoute, type Route } from './navigation';
import { readSession, writeSession } from './session';
import { useDocumentFlow } from './useDocumentFlow';
import { WorkspaceLayout } from './WorkspaceLayout';
import { WorkspaceContext, type WorkspaceApi } from './WorkspaceContext';
import {
  activeDoc,
  initialWorkspace,
  isDocumentView,
  workspaceReducer,
  type View,
  type WorkspaceState,
} from './workspace';

// Legal pages are rarely visited: they load on demand. (The workspace shell stays in the
// entry bundle: splitting it saved ~3 KB but cost a dozen extra requests on slow networks.)
const LegalPage = lazy(async () => ({
  default: (await import('../features/site/LegalPage')).LegalPage,
}));

type Page = Exclude<Route, { page: 'app'; view: View }> | { page: 'app' };

/**
 * Checks once whether live AI is configured, so the workspace can explain what is
 * available. Waits until the workspace is opened: the home page does not need it.
 */
function useAiAvailability(enabled: boolean): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);
  const checked = available !== null;
  useEffect(() => {
    if (!enabled || checked) return undefined;
    const controller = new AbortController();
    api
      .health(controller.signal)
      .then((health) => setAvailable(health.aiAvailable))
      .catch(() => {
        if (!controller.signal.aborted) setAvailable(false);
      });
    return () => controller.abort();
  }, [enabled, checked]);
  return available;
}

/** Full-height placeholder while a page chunk loads, so nothing below it jumps. */
function PageLoading() {
  return (
    <div className="page-loading">
      <Spinner />
    </div>
  );
}

function SkipLink() {
  const { t } = useI18n();
  // The URL hash holds the page, so move focus instead of following the fragment.
  const skip = (event: MouseEvent<HTMLAnchorElement>): void => {
    event.preventDefault();
    const main = document.getElementById('main');
    main?.focus();
    main?.scrollIntoView({ block: 'start' });
  };
  return (
    <a className="skip-link" href="#main" onClick={skip}>
      {t('skipToContent')}
    </a>
  );
}

const pageOf = (route: Route): Page => (route.page === 'app' ? { page: 'app' } : route);

function initialState(route: Route): WorkspaceState {
  // Papers opened before a refresh are still in this tab's session storage.
  const restored = readSession() ?? initialWorkspace;
  return route.page === 'app'
    ? workspaceReducer(restored, { type: 'navigate', view: route.view })
    : restored;
}

function Shell() {
  const { t } = useI18n();
  const { explanationLanguage, setExplanationLanguage, setUiLanguage } = useSettings();
  const [initialRoute] = useState(() => parseRoute(window.location.hash));
  const [page, setPage] = useState<Page>(() => pageOf(initialRoute));
  const [state, dispatch] = useReducer(workspaceReducer, initialRoute, initialState);
  const [askDraft, setAskDraft] = useState('');
  const serverAi = useAiAvailability(page.page === 'app');
  // A reader's own key makes live AI available even when the server has none.
  const hasUserKey = useHasUserKey();
  const aiAvailable = hasUserKey ? true : serverAi;
  const doc = activeDoc(state);
  const activeId = state.activeId;

  // Keep this tab's papers through a refresh (never sent anywhere; cleared with the tab).
  useEffect(() => {
    const timer = window.setTimeout(() => writeSession(state), 300);
    return () => window.clearTimeout(timer);
  }, [state]);

  const onLoaded = useCallback((loaded: LoadedDocument) => {
    const id = `paper-${crypto.randomUUID()}`;
    dispatch({ type: 'addDocument', id, loaded });
    setPage({ page: 'app' });
    writeRoute({ page: 'app', view: 'overview' }, id);
  }, []);

  const onReplaced = useCallback((docId: string, loaded: LoadedDocument) => {
    dispatch({ type: 'replaceAnalysis', id: docId, loaded });
  }, []);

  const flow = useDocumentFlow({
    explanationLanguage,
    aiAvailable: aiAvailable === true,
    onLoaded,
    onReplaced,
  });

  const go = useCallback(
    (view: View, options: { docId?: string; pointId?: string } = {}) => {
      if (options.docId) dispatch({ type: 'openDocument', id: options.docId, view });
      if (options.pointId) dispatch({ type: 'selectPoint', pointId: options.pointId });
      dispatch({ type: 'navigate', view });
      setPage({ page: 'app' });
      writeRoute({ page: 'app', view }, options.docId ?? activeId);
    },
    [activeId],
  );

  const openLanding = useCallback(() => {
    setPage({ page: 'landing' });
    writeRoute({ page: 'landing' });
  }, []);

  const ask = useCallback(
    (question: string) => {
      if (!doc) return;
      const id = `ask-${crypto.randomUUID()}`;
      const docId = doc.id;
      dispatch({ type: 'askStarted', docId, id, question });
      api
        .ask({ text: doc.loaded.text, question, language: doc.loaded.analysis.language })
        .then((result) => dispatch({ type: 'askFinished', docId, id, result }))
        .catch((error: unknown) => {
          const code =
            error instanceof ApiClientError && error.code !== 'cancelled' ? error.code : 'internal';
          dispatch({ type: 'askFailed', docId, id, errorKey: `error_${code}` as MessageKey });
        });
    },
    [doc],
  );

  // The URL always shows where the reader is; Back/Forward and links move between pages.
  useEffect(() => {
    const route = parseRoute(window.location.hash);
    if (route.page === 'app') writeRoute({ page: 'app', view: state.view }, state.activeId, true);
    else writeRoute(route, null, true);
    // Only normalise the address once, on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sync = (): void => {
      const { hash } = window.location;
      if (hash !== '' && !hash.startsWith('#/')) return; // e.g. the skip link
      const route = parseRoute(hash);
      setPage(pageOf(route));
      if (route.page !== 'app') return;
      const docId = readRouteDocId(window.history.state);
      if (docId) dispatch({ type: 'openDocument', id: docId, view: route.view });
      dispatch({ type: 'navigate', view: route.view });
    };
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  // A new page or section starts at the top.
  const screenKey = `${page.page}|${page.page === 'legal' ? page.doc : ''}|${state.view}|${state.activeId}|${flow.state.stage}`;
  const previousKey = useRef(screenKey);
  useEffect(() => {
    if (previousKey.current === screenKey) return;
    previousKey.current = screenKey;
    window.scrollTo?.({ top: 0 });
  }, [screenKey]);

  useEffect(() => {
    const brand = t('appName');
    if (page.page === 'landing') {
      document.title = `${brand} — ${t('brandTagline')}`;
    } else if (page.page === 'legal') {
      document.title = `${t(LEGAL_TITLE_KEYS[page.doc])} · ${brand}`;
    } else {
      const section = t(VIEW_META[state.view].labelKey);
      const paper =
        doc && isDocumentView(state.view) ? `${doc.loaded.analysis.documentType} · ` : '';
      document.title = `${section} · ${paper}${brand}`;
    }
  }, [page, state.view, doc, t]);

  const explainAgain = useCallback(
    (language: ExplanationLanguage) => {
      if (!doc || doc.loaded.analysis.language === language) return;
      // Reading a paper in Telugu but navigating in English feels broken, so the whole
      // interface follows when the chosen language is one we have translated.
      if (isUiLanguage(language)) setUiLanguage(language);
      else setExplanationLanguage(language);
      void flow.explainAgain(doc.id, doc.loaded, language);
    },
    [doc, flow, setExplanationLanguage, setUiLanguage],
  );

  const api_: WorkspaceApi = useMemo(
    () => ({
      state,
      doc,
      aiAvailable: aiAvailable === true,
      dispatch,
      go,
      ask,
      explainAgain,
      askDraft,
      setAskDraft,
    }),
    [state, doc, aiAvailable, go, ask, explainAgain, askDraft],
  );

  if (page.page === 'landing') {
    return (
      <LandingPage
        onTryExample={() => {
          go('home');
          void flow.loadSample('rental');
        }}
      />
    );
  }

  if (page.page === 'legal') {
    return (
      <Suspense fallback={<PageLoading />}>
        <LegalPage doc={page.doc} />
      </Suspense>
    );
  }

  return (
    <WorkspaceContext.Provider value={api_}>
      <WorkspaceLayout flow={flow} aiAvailable={aiAvailable} openLanding={openLanding} />
    </WorkspaceContext.Provider>
  );
}

export function App() {
  const { uiLanguage } = useSettings();
  // Re-render once a newly chosen interface language has downloaded.
  const [, setLoadedCount] = useState(0);
  useEffect(() => {
    if (hasMessages(uiLanguage)) return;
    void loadMessages(uiLanguage).then(() => setLoadedCount((count) => count + 1));
  }, [uiLanguage]);
  const language = hasMessages(uiLanguage) ? uiLanguage : 'en';

  return (
    <I18nProvider language={language}>
      <SpeechProvider>
        <SkipLink />
        <Shell />
      </SpeechProvider>
    </I18nProvider>
  );
}
