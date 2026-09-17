import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { UiLanguage } from '../../shared/languages';
import { api } from '../api/client';
import { Icon } from '../components/Icon';
import { LanguageMenu } from '../components/LanguageMenu';
import { Logo } from '../components/Logo';
import { Spinner } from '../components/ui';
import { InputScreen } from '../features/input/InputScreen';
import { LanguageWelcome } from '../features/welcome/LanguageWelcome';
import { WorkingScreen } from '../features/working/WorkingScreen';
import { SpeechProvider } from '../hooks/speech';
import { I18nProvider, useI18n } from '../i18n/I18nProvider';
import { useSettings } from '../settings/SettingsProvider';
import { useDocumentFlow } from './useDocumentFlow';

// The result experience is the largest part of the UI; load it only once there is a result.
const ResultScreen = lazy(async () => ({
  default: (await import('../features/result/ResultScreen')).ResultScreen,
}));

/* ------------------------------ Browser history ----------------------------- */
/* Back/forward move between: language page → start screen → result.           */

type HistoryStep = 'welcome' | 'app' | 'result';
const HISTORY_KEY = 'clauseAnatomy';

export function readHistoryStep(state: unknown): HistoryStep {
  const value =
    state && typeof state === 'object' ? (state as Record<string, unknown>)[HISTORY_KEY] : null;
  return value === 'app' || value === 'result' ? value : 'welcome';
}

function pushHistoryStep(step: HistoryStep): void {
  window.history.pushState({ [HISTORY_KEY]: step }, '');
}

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

function Header({
  onHome,
  onStartOver,
}: {
  /** `null` on the language page itself. */
  onHome: (() => void) | null;
  onStartOver: (() => void) | null;
}) {
  const { t } = useI18n();
  const brand = (
    <>
      <Logo size={40} className="brand__logo" />
      <span className="brand__text">
        <span className="brand__name">{t('appName')}</span>
        <span className="brand__tagline">{t('brandTagline')}</span>
      </span>
    </>
  );

  return (
    <header className="site-header no-print">
      <div className="site-header__inner">
        {onHome ? (
          <button
            type="button"
            className="brand brand--link"
            onClick={onHome}
            title={t('homeLabel')}
          >
            {brand}
          </button>
        ) : (
          <div className="brand">{brand}</div>
        )}
        <div className="site-header__actions">
          {onStartOver && (
            <button
              type="button"
              className="button button--ghost button--small header-button"
              onClick={onStartOver}
              aria-label={t('startOver')}
            >
              <Icon name="refresh" />
              <span className="header-button__label">{t('startOver')}</span>
            </button>
          )}
          {onHome && <LanguageMenu onOpenLanguagePage={onHome} />}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <Logo size={32} />
          <span>{t('appName')}</span>
        </div>
        <p className="site-footer__disclaimer">
          <Icon name="shield" /> <strong>{t('disclaimerShort')}</strong>
        </p>
        <p className="site-footer__note">{t('disclaimerFull')}</p>
        <p className="site-footer__note">
          <Icon name="lock" /> {t('footerPrivacy')}
        </p>
      </div>
    </footer>
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
  const { uiLanguage, setUiLanguage, explanationLanguage } = useSettings();
  const [view, setView] = useState<'welcome' | 'app'>('welcome');
  // The journey mounts on the first language choice and then stays mounted (hidden on
  // the language page), so a result is never lost by visiting the language page.
  const [journeyStarted, setJourneyStarted] = useState(false);
  const aiAvailable = useAiAvailability();
  const flow = useDocumentFlow({ explanationLanguage, aiAvailable: aiAvailable === true });
  const { state, reset } = flow;
  const mainRef = useRef<HTMLElement>(null);
  const screen = view === 'welcome' ? 'welcome' : state.stage;

  useEffect(() => {
    window.history.replaceState({ [HISTORY_KEY]: 'welcome' }, '');
    const onPopState = (event: PopStateEvent): void => {
      const step = readHistoryStep(event.state);
      if (step === 'welcome') {
        setView('welcome');
        return;
      }
      setView('app');
      if (step === 'app') reset();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [reset]);

  useEffect(() => {
    if (state.stage === 'result' && readHistoryStep(window.history.state) !== 'result') {
      pushHistoryStep('result');
    }
  }, [state.stage]);

  // New screen: start at the top, and tell assistive technology where we are.
  const previousScreen = useRef(screen);
  useEffect(() => {
    if (previousScreen.current === screen) return;
    const cameFromWelcome = previousScreen.current === 'welcome';
    previousScreen.current = screen;
    window.scrollTo?.({ top: 0 });
    if (cameFromWelcome) mainRef.current?.querySelector<HTMLElement>('h1')?.focus();
  }, [screen]);

  useEffect(() => {
    document.title =
      screen === 'result' && state.stage === 'result'
        ? t('documentTitle', { documentType: state.document.analysis.documentType })
        : `${t('appName')} — ${t('brandTagline')}`;
  }, [screen, state, t]);

  const chooseLanguage = (language: UiLanguage): void => {
    setUiLanguage(language);
    setJourneyStarted(true);
    setView('app');
    pushHistoryStep('app');
  };

  const openLanguagePage = (): void => {
    setView('welcome');
    pushHistoryStep('welcome');
  };

  const startOver = (): void => {
    if (readHistoryStep(window.history.state) === 'result') window.history.back();
    else reset();
  };

  return (
    <>
      <Header
        onHome={view === 'app' ? openLanguagePage : null}
        onStartOver={view === 'app' && state.stage !== 'input' ? startOver : null}
      />
      <main id="main" ref={mainRef} className={`page page--${screen}`} tabIndex={-1}>
        {view === 'welcome' && <LanguageWelcome current={uiLanguage} onChoose={chooseLanguage} />}
        {journeyStarted && (
          <div className="journey" hidden={view === 'welcome'}>
            {state.stage === 'input' && (
              <InputScreen
                aiAvailable={aiAvailable}
                error={state.error}
                pending={state.pending}
                onSubmitText={(text) => void flow.submitText(text)}
                onSubmitFile={(file) => void flow.submitFile(file)}
                onLoadSample={(id) => void flow.loadSample(id)}
                onConfirmConsent={(pending) => void flow.confirmConsent(pending)}
                onCancelConsent={flow.cancelConsent}
              />
            )}
            {state.stage === 'working' && (
              <WorkingScreen step={state.step} onCancel={flow.cancel} />
            )}
            {state.stage === 'result' && (
              <Suspense fallback={<Spinner />}>
                <ResultScreen document={state.document} aiAvailable={aiAvailable === true} />
              </Suspense>
            )}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export function App() {
  const { uiLanguage } = useSettings();

  return (
    <I18nProvider language={uiLanguage ?? 'en'}>
      <SpeechProvider>
        <SkipLink />
        <div className="backdrop" aria-hidden="true" />
        <Shell />
      </SpeechProvider>
    </I18nProvider>
  );
}
