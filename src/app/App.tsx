import { lazy, Suspense, useEffect, useState } from 'react';
import { LANGUAGE_INFO, UI_LANGUAGES, isUiLanguage } from '../../shared/languages';
import { api } from '../api/client';
import { Icon } from '../components/Icon';
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
  onStartOver,
  showLanguage,
}: {
  onStartOver: (() => void) | null;
  showLanguage: boolean;
}) {
  const { t, language } = useI18n();
  const { setUiLanguage } = useSettings();
  return (
    <header className="site-header no-print">
      <div className="site-header__inner">
        <div className="brand">
          <Logo size={40} className="brand__logo" />
          <span className="brand__text">
            <span className="brand__name">{t('appName')}</span>
            <span className="brand__tagline">{t('brandTagline')}</span>
          </span>
        </div>
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
          {showLanguage && (
            <label className="language-select">
              <Icon name="globe" />
              <span className="visually-hidden">{t('uiLanguageLabel')}</span>
              <select
                value={language}
                onChange={(event) => {
                  if (isUiLanguage(event.target.value)) setUiLanguage(event.target.value);
                }}
              >
                {UI_LANGUAGES.map((option) => (
                  <option key={option} value={option} lang={option}>
                    {LANGUAGE_INFO[option].nativeName}
                  </option>
                ))}
              </select>
            </label>
          )}
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

function Journey() {
  const { explanationLanguage } = useSettings();
  const aiAvailable = useAiAvailability();
  const flow = useDocumentFlow({ explanationLanguage, aiAvailable: aiAvailable === true });
  const { state } = flow;

  return (
    <>
      <Header onStartOver={state.stage === 'input' ? null : flow.reset} showLanguage />
      <main id="main" className={`page page--${state.stage}`} tabIndex={-1}>
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
        {state.stage === 'working' && <WorkingScreen step={state.step} onCancel={flow.cancel} />}
        {state.stage === 'result' && (
          <Suspense fallback={<Spinner />}>
            <ResultScreen document={state.document} aiAvailable={aiAvailable === true} />
          </Suspense>
        )}
      </main>
      <Footer />
    </>
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

export function App() {
  const { uiLanguage, setUiLanguage } = useSettings();

  return (
    <I18nProvider language={uiLanguage ?? 'en'}>
      <SpeechProvider>
        <SkipLink />
        <div className="backdrop" aria-hidden="true" />
        {uiLanguage === null ? (
          <>
            <Header onStartOver={null} showLanguage={false} />
            <main id="main" className="page page--welcome" tabIndex={-1}>
              <LanguageWelcome onChoose={setUiLanguage} />
            </main>
          </>
        ) : (
          <Journey />
        )}
      </SpeechProvider>
    </I18nProvider>
  );
}
