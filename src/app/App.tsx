import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import type { UiLanguage } from '../../shared/languages';
import { ApiClientError, api } from '../api/client';
import { Dialog } from '../components/Dialog';
import { Icon } from '../components/Icon';
import { Spinner } from '../components/ui';
import { HomeView } from '../features/home/HomeView';
import { BottomNav } from '../features/shell/BottomNav';
import { buildPaletteItems, CommandPalette } from '../features/shell/CommandPalette';
import { Sidebar } from '../features/shell/Sidebar';
import { Topbar } from '../features/shell/Topbar';
import { LanguageWelcome } from '../features/welcome/LanguageWelcome';
import { WorkingScreen } from '../features/working/WorkingScreen';
import { SpeechProvider } from '../hooks/speech';
import { I18nProvider, useI18n } from '../i18n/I18nProvider';
import type { MessageKey } from '../i18n/messages/en';
import { useSettings } from '../settings/SettingsProvider';
import type { LoadedDocument } from './flow';
import { readHistoryEntry, VIEW_META, writeHistoryEntry } from './navigation';
import { useDocumentFlow } from './useDocumentFlow';
import { WorkspaceContext, type WorkspaceApi } from './WorkspaceContext';
import {
  activeDoc,
  initialWorkspace,
  isDocumentView,
  workspaceReducer,
  type View,
} from './workspace';

// Sections load on demand: the first screen stays light, each section is its own chunk.
const OverviewView = lazy(async () => ({
  default: (await import('../features/overview/OverviewView')).OverviewView,
}));
const ClausesView = lazy(async () => ({
  default: (await import('../features/clauses/ClausesView')).ClausesView,
}));
const DocumentView = lazy(async () => ({
  default: (await import('../features/document/DocumentView')).DocumentView,
}));
const RiskView = lazy(async () => ({
  default: (await import('../features/risks/RiskView')).RiskView,
}));
const WhatIfView = lazy(async () => ({
  default: (await import('../features/whatif/WhatIfView')).WhatIfView,
}));
const AskView = lazy(async () => ({ default: (await import('../features/ask/AskView')).AskView }));
const GlossaryView = lazy(async () => ({
  default: (await import('../features/glossary/GlossaryView')).GlossaryView,
}));
const PlanView = lazy(async () => ({
  default: (await import('../features/plan/PlanView')).PlanView,
}));
const CompareView = lazy(async () => ({
  default: (await import('../features/compare/CompareView')).CompareView,
}));

const SECTION_VIEWS = {
  overview: OverviewView,
  clauses: ClausesView,
  document: DocumentView,
  risks: RiskView,
  whatif: WhatIfView,
  ask: AskView,
  glossary: GlossaryView,
  plan: PlanView,
  compare: CompareView,
} as const;

/** Checks once whether live AI is configured, so the UI can explain what is available. */
function useAiAvailability(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    api
      .health(controller.signal)
      .then((health) => setAvailable(health.aiAvailable))
      .catch(() => {
        if (!controller.signal.aborted) setAvailable(false);
      });
    return () => controller.abort();
  }, []);
  return available;
}

function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return (
    !!element &&
    (element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName))
  );
}

function SkipLink() {
  const { t } = useI18n();
  return (
    <a className="skip-link" href="#main">
      {t('skipToContent')}
    </a>
  );
}

function Shell() {
  const { t } = useI18n();
  const { uiLanguage, setUiLanguage, explanationLanguage, theme, setTheme } = useSettings();
  const [showWelcome, setShowWelcome] = useState(true);
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspace);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [askDraft, setAskDraft] = useState('');
  const aiAvailable = useAiAvailability();
  const doc = activeDoc(state);
  const activeId = state.activeId;

  const onLoaded = useCallback((loaded: LoadedDocument) => {
    const id = `paper-${crypto.randomUUID()}`;
    dispatch({ type: 'addDocument', id, loaded });
    writeHistoryEntry({ screen: 'app', view: 'overview', docId: id });
  }, []);

  const flow = useDocumentFlow({
    explanationLanguage,
    aiAvailable: aiAvailable === true,
    onLoaded,
  });

  const go = useCallback(
    (view: View, options: { docId?: string; pointId?: string } = {}) => {
      if (options.docId) dispatch({ type: 'openDocument', id: options.docId, view });
      if (options.pointId) dispatch({ type: 'selectPoint', pointId: options.pointId });
      dispatch({ type: 'navigate', view });
      setShowWelcome(false);
      writeHistoryEntry({
        screen: 'app',
        view,
        docId: options.docId ?? activeId,
      });
    },
    [activeId],
  );

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

  // Browser back/forward move between the language page and workspace sections.
  useEffect(() => {
    writeHistoryEntry({ screen: 'welcome' }, true);
    const onPopState = (event: PopStateEvent): void => {
      const entry = readHistoryEntry(event.state);
      setMenuOpen(false);
      setPaletteOpen(false);
      if (entry.screen === 'welcome') {
        setShowWelcome(true);
        return;
      }
      setShowWelcome(false);
      if (entry.docId) dispatch({ type: 'openDocument', id: entry.docId, view: entry.view });
      dispatch({ type: 'navigate', view: entry.view });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Global shortcuts: Ctrl/⌘ + K or "/" opens search.
  useEffect(() => {
    if (showWelcome) return undefined;
    const onKeyDown = (event: KeyboardEvent): void => {
      const combo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      if (combo || (event.key === '/' && !isTyping(event.target))) {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showWelcome]);

  // A new section starts at the top.
  const screenKey = `${showWelcome}|${state.view}|${state.activeId}|${flow.state.stage}`;
  const previousKey = useRef(screenKey);
  useEffect(() => {
    if (previousKey.current === screenKey) return;
    previousKey.current = screenKey;
    window.scrollTo?.({ top: 0 });
  }, [screenKey]);

  useEffect(() => {
    const section = t(VIEW_META[state.view].labelKey);
    const paper = doc && isDocumentView(state.view) ? `${doc.loaded.analysis.documentType} · ` : '';
    document.title = showWelcome
      ? `${t('appName')} — ${t('brandTagline')}`
      : `${section} · ${paper}${t('appName')}`;
  }, [showWelcome, state.view, doc, t]);

  const chooseLanguage = (language: UiLanguage): void => {
    setUiLanguage(language);
    setShowWelcome(false);
    writeHistoryEntry({ screen: 'app', view: state.view, docId: state.activeId });
  };

  const openLanguagePage = useCallback((): void => {
    setMenuOpen(false);
    setShowWelcome(true);
    writeHistoryEntry({ screen: 'welcome' });
  }, []);

  const api_: WorkspaceApi = useMemo(
    () => ({
      state,
      doc,
      aiAvailable: aiAvailable === true,
      dispatch,
      go,
      ask,
      askDraft,
      setAskDraft,
    }),
    [state, doc, aiAvailable, go, ask, askDraft],
  );

  const paletteItems = useMemo(
    () =>
      paletteOpen
        ? buildPaletteItems(state, t, {
            go,
            toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
            openLanguagePage,
          })
        : [],
    [paletteOpen, state, t, go, theme, setTheme, openLanguagePage],
  );

  if (showWelcome) {
    return (
      <main id="main" className="welcome-page" tabIndex={-1}>
        <LanguageWelcome current={uiLanguage} onChoose={chooseLanguage} />
      </main>
    );
  }

  const Section = state.view === 'home' ? null : SECTION_VIEWS[state.view];
  const showBottomNav = Boolean(doc) && isDocumentView(state.view);

  return (
    <WorkspaceContext.Provider value={api_}>
      <div className={`app${showBottomNav ? ' app--with-bottom-nav' : ''}`}>
        <aside className="app__rail no-print">
          <Sidebar
            state={state}
            onNavigate={(view, docId) => go(view, { docId })}
            onOpenLanguagePage={openLanguagePage}
          />
        </aside>

        <div className="app__main">
          <Topbar
            view={state.view}
            doc={doc}
            menuOpen={menuOpen}
            onOpenMenu={() => setMenuOpen(true)}
            onOpenPalette={() => setPaletteOpen(true)}
            onNavigate={(view) => go(view)}
          />
          <main id="main" className={`workspace workspace--${state.view}`} tabIndex={-1}>
            {flow.state.stage === 'working' ? (
              <WorkingScreen step={flow.state.step} onCancel={flow.cancel} />
            ) : Section ? (
              <Suspense fallback={<Spinner />}>
                <Section key={`${state.view}-${state.activeId}`} />
              </Suspense>
            ) : (
              <HomeView
                aiAvailable={aiAvailable}
                error={flow.state.error}
                pending={flow.state.pending}
                onSubmitText={(text) => void flow.submitText(text)}
                onSubmitFile={(file) => void flow.submitFile(file)}
                onLoadSample={(id) => void flow.loadSample(id)}
                onConfirmConsent={(pending) => void flow.confirmConsent(pending)}
                onCancelConsent={flow.cancelConsent}
              />
            )}
          </main>
          <footer className="app__footer">
            <p>
              <Icon name="shield" /> <strong>{t('disclaimerShort')}</strong>
            </p>
            <p className="hint">{t('disclaimerFull')}</p>
            <p className="hint">
              <Icon name="lock" /> {t('footerPrivacy')}
            </p>
          </footer>
        </div>

        {showBottomNav && (
          <BottomNav
            view={state.view}
            onNavigate={(view) => go(view)}
            onOpenMenu={() => setMenuOpen(true)}
          />
        )}

        {menuOpen && (
          <Dialog
            id="workspace-drawer"
            label={t('navMainLabel')}
            className="drawer-panel"
            onClose={() => setMenuOpen(false)}
          >
            <button
              type="button"
              className="icon-btn drawer-panel__close"
              onClick={() => setMenuOpen(false)}
            >
              <Icon name="x" />
              <span className="visually-hidden">{t('closeMenu')}</span>
            </button>
            <Sidebar
              state={state}
              onNavigate={(view, docId) => go(view, { docId })}
              onOpenLanguagePage={openLanguagePage}
              onAfterNavigate={() => setMenuOpen(false)}
            />
          </Dialog>
        )}

        {paletteOpen && (
          <CommandPalette items={paletteItems} onClose={() => setPaletteOpen(false)} />
        )}
      </div>
    </WorkspaceContext.Provider>
  );
}

export function App() {
  const { uiLanguage } = useSettings();

  return (
    <I18nProvider language={uiLanguage ?? 'en'}>
      <SpeechProvider>
        <SkipLink />
        <Shell />
      </SpeechProvider>
    </I18nProvider>
  );
}
