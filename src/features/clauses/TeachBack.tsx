import { useState } from 'react';
import type { ExplanationLanguage } from '../../../shared/languages';
import type { TeachBack as TeachBackCheck } from '../../../shared/schema';
import { Icon, type IconName } from '../../components/Icon';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages/en';
import type { CheckOutcome } from '../../lib/brief';

export type TeachBackAnswer = 'yes' | 'no' | 'unsure';

export function evaluateAnswer(
  answer: TeachBackAnswer,
  correct: TeachBackCheck['answer'],
): CheckOutcome {
  if (answer === 'unsure') return 'unsure';
  return answer === correct ? 'correct' : 'wrong';
}

const ANSWERS: readonly { answer: TeachBackAnswer; key: MessageKey; icon: IconName }[] = [
  { answer: 'yes', key: 'answerYes', icon: 'check' },
  { answer: 'no', key: 'answerNo', icon: 'ban' },
  { answer: 'unsure', key: 'answerNotSure', icon: 'help' },
];

/**
 * "Did you get it?" — the teach-back method from health literacy, applied to legal
 * papers. A real-life Yes/No question confirms understanding; a wrong or unsure answer
 * explains again in simpler words and adds the clause to the lawyer questions.
 */
export function TeachBack({
  pointId,
  check,
  simple,
  language,
  outcome,
  onAnswer,
}: {
  pointId: string;
  check: TeachBackCheck;
  simple: string;
  language: ExplanationLanguage;
  outcome: CheckOutcome | undefined;
  onAnswer: (outcome: CheckOutcome) => void;
}) {
  const { t } = useI18n();
  const [chosen, setChosen] = useState<TeachBackAnswer | null>(null);
  const labelId = `${pointId}-check`;

  return (
    <div className={`quiz${outcome ? ` quiz--${outcome}` : ''}`}>
      <h3 id={labelId} className="quiz__heading">
        <span className="quiz__tag">?</span>
        {t('checkHeading')}
      </h3>
      <p className="quiz__question" lang={language}>
        {check.question}
      </p>
      <div className="quiz__answers" role="group" aria-labelledby={labelId}>
        {ANSWERS.map(({ answer, key, icon }) => (
          <button
            key={answer}
            type="button"
            className="quiz__answer"
            aria-pressed={chosen === answer}
            onClick={() => {
              setChosen(answer);
              onAnswer(evaluateAnswer(answer, check.answer));
            }}
          >
            <Icon name={icon} /> {t(key)}
          </button>
        ))}
      </div>
      {outcome === 'correct' && (
        <div className="quiz__feedback quiz__feedback--correct" role="status">
          <p className="quiz__feedback-title">
            <Icon name="checkCircle" /> {t('checkCorrect')}
          </p>
          <p lang={language}>{check.explanation}</p>
        </div>
      )}
      {(outcome === 'wrong' || outcome === 'unsure') && (
        <div className="quiz__feedback quiz__feedback--retry" role="status">
          <p className="quiz__feedback-title">
            <Icon name="refresh" /> {t(outcome === 'wrong' ? 'checkWrong' : 'checkUnsure')}
          </p>
          <p lang={language}>{simple}</p>
          <p lang={language}>{check.explanation}</p>
          <p className="hint">
            <Icon name="flag" /> {t('checkAddedToBrief')}
          </p>
        </div>
      )}
    </div>
  );
}
