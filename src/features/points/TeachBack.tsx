import type { ExplanationLanguage } from '../../../shared/languages';
import type { TeachBack as TeachBackCheck } from '../../../shared/schema';
import { Icon } from '../../components/Icon';
import { Notice } from '../../components/ui';
import { useI18n } from '../../i18n/I18nProvider';
import type { CheckOutcome } from '../../lib/brief';

export type TeachBackAnswer = 'yes' | 'no' | 'unsure';

export function evaluateAnswer(
  answer: TeachBackAnswer,
  correct: TeachBackCheck['answer'],
): CheckOutcome {
  if (answer === 'unsure') return 'unsure';
  return answer === correct ? 'correct' : 'wrong';
}

/**
 * "Did you get it?" — the teach-back method from health literacy, applied to legal
 * papers. A real-life Yes/No question confirms understanding; a wrong or unsure answer
 * explains again in simpler words and adds the point to the lawyer questions.
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
  const labelId = `${pointId}-check`;
  const answers: readonly [TeachBackAnswer, string][] = [
    ['yes', t('answerYes')],
    ['no', t('answerNo')],
    ['unsure', t('answerNotSure')],
  ];

  return (
    <div className="teach-back">
      <h3 id={labelId} className="teach-back__heading">
        <Icon name="help" /> {t('checkHeading')}
      </h3>
      <p className="teach-back__question" lang={language}>
        {check.question}
      </p>
      <div className="button-row" role="group" aria-labelledby={labelId}>
        {answers.map(([answer, label]) => (
          <button
            key={answer}
            type="button"
            className="button button--secondary"
            onClick={() => onAnswer(evaluateAnswer(answer, check.answer))}
          >
            {label}
          </button>
        ))}
      </div>
      {outcome === 'correct' && (
        <Notice tone="success" title={t('checkCorrect')}>
          <p lang={language}>{check.explanation}</p>
        </Notice>
      )}
      {(outcome === 'wrong' || outcome === 'unsure') && (
        <Notice
          tone="warning"
          icon="refresh"
          title={t(outcome === 'wrong' ? 'checkWrong' : 'checkUnsure')}
        >
          <p lang={language}>{simple}</p>
          <p lang={language}>{check.explanation}</p>
          <p className="small">{t('checkAddedToBrief')}</p>
        </Notice>
      )}
    </div>
  );
}
