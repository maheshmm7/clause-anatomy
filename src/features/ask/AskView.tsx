import { useId, useState, type FormEvent } from 'react';
import { LANGUAGE_INFO } from '../../../shared/languages';
import { LIMITS } from '../../../shared/limits';
import type { AnalysisResult } from '../../../shared/schema';
import { Icon } from '../../components/Icon';
import { Badge, Notice, SpeakButton, Spinner } from '../../components/ui';
import { useSpeechInput } from '../../hooks/speech';
import { useI18n } from '../../i18n/I18nProvider';
import { detectScriptLanguage } from '../../lib/browser';
import type { AskEntry } from '../result/resultState';

const BASIS_STYLE = {
  document: { tone: 'success', icon: 'document', key: 'askBasisDocument' },
  general: { tone: 'warning', icon: 'help', key: 'askBasisGeneral' },
  none: { tone: 'danger', icon: 'shield', key: 'askBasisNone' },
} as const;

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

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length < LIMITS.minQuestionChars || busy) return;
    onAsk(trimmed);
    setQuestion('');
  };

  return (
    <div className="ask stack">
      {!aiAvailable && <Notice tone="warning" title={t('askUnavailable')} />}

      <form className="card stack" onSubmit={submit}>
        <label htmlFor={fieldId} className="card__title">
          {t('askHeading')}
        </label>
        <textarea
          id={fieldId}
          rows={3}
          value={question}
          maxLength={LIMITS.maxQuestionChars}
          placeholder={t('askPlaceholder')}
          disabled={!aiAvailable}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <div className="button-row">
          <button
            type="submit"
            className="button button--primary button--large"
            disabled={!aiAvailable || busy || question.trim().length < LIMITS.minQuestionChars}
          >
            <Icon name="sparkle" /> {t('askSubmit')}
          </button>
          {voice.supported && aiAvailable && (
            <button
              type="button"
              className="button button--secondary button--large"
              aria-pressed={voice.listening}
              onClick={voice.listening ? voice.stop : voice.start}
            >
              <Icon name={voice.listening ? 'stop' : 'mic'} />
              {voice.listening ? t('askListening') : t('askSpeak')}
            </button>
          )}
        </div>
      </form>

      <ul className="ask__entries" aria-live="polite">
        {entries.map((entry) => (
          <li key={entry.id} className="card stack">
            <p className="ask__question">
              <span className="section-label">{t('youAsked')}</span>{' '}
              <span lang={detectScriptLanguage(entry.question)}>{entry.question}</span>
            </p>
            {entry.status === 'loading' && (
              <p className="muted">
                <Spinner /> {t('askThinking')}
              </p>
            )}
            {entry.status === 'error' && entry.errorKey && (
              <Notice tone="danger" title={t(entry.errorKey)} />
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
                <SpeakButton
                  id={`answer-${entry.id}`}
                  text={entry.result.answer}
                  language={language}
                />
                {entry.result.quotes.map((quote) => (
                  <figure
                    key={quote.text}
                    className={`quote${quote.verified ? '' : ' quote--unverified'}`}
                  >
                    <blockquote lang={detectScriptLanguage(quote.text)}>{quote.text}</blockquote>
                    <Badge
                      tone={quote.verified ? 'success' : 'warning'}
                      icon={quote.verified ? 'check' : 'alert'}
                    >
                      {t(quote.verified ? 'quoteVerified' : 'quoteUnverified')}
                    </Badge>
                  </figure>
                ))}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
