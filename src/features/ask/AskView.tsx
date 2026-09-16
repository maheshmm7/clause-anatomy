import { useId, useState, type FormEvent } from 'react';
import { LANGUAGE_INFO } from '../../../shared/languages';
import { LIMITS } from '../../../shared/limits';
import type { AnalysisResult } from '../../../shared/schema';
import { Icon } from '../../components/Icon';
import { Logo } from '../../components/Logo';
import { Badge, Notice, SpeakButton } from '../../components/ui';
import { useSpeechInput } from '../../hooks/speech';
import { useI18n } from '../../i18n/I18nProvider';
import { detectScriptLanguage } from '../../lib/browser';
import type { AskEntry } from '../result/resultState';

const BASIS_STYLE = {
  document: { tone: 'success', icon: 'shieldCheck', key: 'askBasisDocument' },
  general: { tone: 'warning', icon: 'help', key: 'askBasisGeneral' },
  none: { tone: 'danger', icon: 'shield', key: 'askBasisNone' },
} as const;

/** Chat-style questions about the paper, typed or spoken. */
export function AskView({
  analysis,
  aiAvailable,
  entries,
  onAsk,
}: {
  analysis: AnalysisResult;
  aiAvailable: boolean;
  entries: readonly AskEntry[];
  onAsk: (question: string) => void;
}) {
  const { t } = useI18n();
  const [question, setQuestion] = useState('');
  const fieldId = useId();
  const language = analysis.language;
  const voice = useSpeechInput(LANGUAGE_INFO[language].speechTag, (spoken) =>
    setQuestion((current) => `${current} ${spoken}`.trim().slice(0, LIMITS.maxQuestionChars)),
  );
  const busy = entries.some((entry) => entry.status === 'loading');
  const suggestions = analysis.scenarios.map((scenario) => scenario.title).slice(0, 3);
  const conversation = [...entries].reverse();

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length < LIMITS.minQuestionChars || busy) return;
    onAsk(trimmed);
    setQuestion('');
  };

  return (
    <div className="ask">
      {!aiAvailable && <Notice tone="warning" title={t('askUnavailable')} />}

      {conversation.length > 0 && (
        <ol className="chat" aria-live="polite">
          {conversation.map((entry) => (
            <li key={entry.id} className="chat__turn">
              <p className="bubble bubble--user">
                <span className="visually-hidden">{t('youAsked')}: </span>
                <span lang={detectScriptLanguage(entry.question)}>{entry.question}</span>
              </p>
              <div className="bubble bubble--assistant">
                <Logo size={28} className="bubble__avatar" />
                <div className="bubble__body">
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
                    <p className="bubble__error">
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
                          className={`quote quote--compact${quote.verified ? '' : ' quote--unverified'}`}
                        >
                          <blockquote lang={detectScriptLanguage(quote.text)}>
                            {quote.text}
                          </blockquote>
                          <Badge
                            tone={quote.verified ? 'success' : 'warning'}
                            icon={quote.verified ? 'shieldCheck' : 'alert'}
                          >
                            {t(quote.verified ? 'quoteVerified' : 'quoteUnverified')}
                          </Badge>
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
              </div>
            </li>
          ))}
        </ol>
      )}

      {aiAvailable && suggestions.length > 0 && (
        <div className="suggestions">
          <p className="section-label">{t('askSuggestions')}</p>
          <ul className="suggestions__list">
            {suggestions.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  className="suggestion"
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
        <label htmlFor={fieldId} className="composer__label">
          {t('askHeading')}
        </label>
        <div className="composer__box">
          <textarea
            id={fieldId}
            rows={2}
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
                className={`icon-button${voice.listening ? ' icon-button--live' : ''}`}
                aria-pressed={voice.listening}
                aria-label={voice.listening ? t('askListening') : t('askSpeak')}
                onClick={voice.listening ? voice.stop : voice.start}
              >
                <Icon name={voice.listening ? 'stop' : 'mic'} />
              </button>
            )}
            <button
              type="submit"
              className="button button--primary"
              disabled={!aiAvailable || busy || question.trim().length < LIMITS.minQuestionChars}
            >
              <Icon name="send" /> {t('askSubmit')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
