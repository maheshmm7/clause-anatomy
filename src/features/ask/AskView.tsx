import { useId, useState, type FormEvent } from 'react';
import { LANGUAGE_INFO } from '../../../shared/languages';
import { LIMITS } from '../../../shared/limits';
import { useActiveDoc } from '../../app/WorkspaceContext';
import { Icon } from '../../components/Icon';
import { Badge, Notice, SpeakButton, ViewHeader } from '../../components/ui';
import { useFocusOnMount } from '../../hooks/dom';
import { useSpeechInput } from '../../hooks/speech';
import { useI18n } from '../../i18n/I18nProvider';
import { detectScriptLanguage } from '../../lib/browser';

const BASIS_STYLE = {
  document: { tone: 'success', icon: 'shieldCheck', key: 'askBasisDocument' },
  general: { tone: 'warning', icon: 'help', key: 'askBasisGeneral' },
  none: { tone: 'danger', icon: 'shield', key: 'askBasisNone' },
} as const;

/** 06 — questions about the paper, typed or spoken, answered with verified quotes. */
export function AskView() {
  const { t } = useI18n();
  const { doc, aiAvailable, ask, askDraft, setAskDraft } = useActiveDoc();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const [question, setQuestion] = useState(askDraft);
  const fieldId = useId();
  const { analysis } = doc.loaded;
  const language = analysis.language;
  const voice = useSpeechInput(LANGUAGE_INFO[language].speechTag, (spoken) =>
    setQuestion((current) => `${current} ${spoken}`.trim().slice(0, LIMITS.maxQuestionChars)),
  );
  const busy = doc.asks.some((entry) => entry.status === 'loading');
  const suggestions = analysis.scenarios.map((scenario) => scenario.title).slice(0, 3);

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length < LIMITS.minQuestionChars || busy) return;
    ask(trimmed);
    setQuestion('');
    setAskDraft('');
  };

  return (
    <div className="view view--ask">
      <ViewHeader
        number="06"
        kicker={t('navAsk')}
        title={t('askHeading')}
        headingRef={headingRef}
      />

      {!aiAvailable && <Notice tone="warning" title={t('askUnavailable')} />}

      <div className="ask-layout">
        <ol className="thread" aria-live="polite">
          {doc.asks.map((entry) => (
            <li key={entry.id} className="thread__turn">
              <p className="msg msg--user">
                <span className="msg__who">{t('youAsked')}</span>
                <span lang={detectScriptLanguage(entry.question)}>{entry.question}</span>
              </p>
              <div className="msg msg--answer">
                {entry.status === 'loading' && (
                  <p className="typing">
                    <span className="typing__dots" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                    {t('askThinking')}
                  </p>
                )}
                {entry.status === 'error' && entry.errorKey && (
                  <p className="msg__error">
                    <Icon name="alert" /> {t(entry.errorKey)}
                  </p>
                )}
                {entry.status === 'done' && entry.result && (
                  <>
                    <Badge
                      tone={BASIS_STYLE[entry.result.basis].tone}
                      icon={BASIS_STYLE[entry.result.basis].icon}
                    >
                      {t(BASIS_STYLE[entry.result.basis].key)}
                    </Badge>
                    <p lang={language}>{entry.result.answer}</p>
                    {entry.result.quotes.map((quote) => (
                      <figure
                        key={quote.text}
                        className={`source source--compact${quote.verified ? '' : ' source--unverified'}`}
                      >
                        <blockquote lang={detectScriptLanguage(quote.text)}>
                          {quote.text}
                        </blockquote>
                        <span className={`stamp${quote.verified ? '' : ' stamp--warn'}`}>
                          <Icon name={quote.verified ? 'shieldCheck' : 'alert'} />
                          {t(quote.verified ? 'quoteVerified' : 'quoteUnverified')}
                        </span>
                      </figure>
                    ))}
                    <SpeakButton
                      id={`answer-${entry.id}`}
                      text={entry.result.answer}
                      language={language}
                    />
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>

        {aiAvailable && suggestions.length > 0 && (
          <div className="suggestions">
            <p className="sub-label">{t('askSuggestions')}</p>
            <ul className="suggestions__list">
              {suggestions.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    className="chip-btn"
                    lang={language}
                    onClick={() => setQuestion(suggestion)}
                  >
                    <Icon name="sparkle" /> {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form className="composer" onSubmit={submit}>
          <label htmlFor={fieldId} className="sub-label">
            {t('askHeading')}
          </label>
          <div className="composer__box">
            <textarea
              id={fieldId}
              rows={3}
              value={question}
              maxLength={LIMITS.maxQuestionChars}
              placeholder={t('askPlaceholder')}
              disabled={!aiAvailable}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <div className="composer__actions">
              {voice.supported && aiAvailable && (
                <button
                  type="button"
                  className={`icon-btn${voice.listening ? ' icon-btn--live' : ''}`}
                  aria-pressed={voice.listening}
                  onClick={voice.listening ? voice.stop : voice.start}
                >
                  <Icon name={voice.listening ? 'stop' : 'mic'} />
                  <span className="visually-hidden">
                    {voice.listening ? t('askListening') : t('askSpeak')}
                  </span>
                </button>
              )}
              <button
                type="submit"
                className="btn btn--primary"
                disabled={!aiAvailable || busy || question.trim().length < LIMITS.minQuestionChars}
              >
                <Icon name="send" /> {t('askSubmit')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
