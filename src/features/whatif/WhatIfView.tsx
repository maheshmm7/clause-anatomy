import { useState } from 'react';
import type { AnalysisResult, ScenarioOutcome } from '../../../shared/schema';
import { walkScenario, type ScenarioAnswer } from '../../../shared/scenario';
import { Icon, type IconName } from '../../components/Icon';
import { SpeakButton } from '../../components/ui';
import { useFocusOnChange } from '../../hooks/dom';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages/en';

const OUTCOME_STYLE: Record<ScenarioOutcome['tone'], { key: MessageKey; icon: IconName }> = {
  good: { key: 'toneGood', icon: 'checkCircle' },
  caution: { key: 'toneCaution', icon: 'alert' },
  bad: { key: 'toneBad', icon: 'ban' },
};

/**
 * "What if…?" simulator. The decision tree comes from the analysis, but walking it is
 * plain deterministic code (shared/scenario.ts): same answers, same outcome, every time.
 */
export function WhatIfView({
  analysis,
  onOpenPoint,
}: {
  analysis: AnalysisResult;
  onOpenPoint: (pointId: string) => void;
}) {
  const { t } = useI18n();
  const [scenarioId, setScenarioId] = useState<string | null>(analysis.scenarios[0]?.id ?? null);
  const [answers, setAnswers] = useState<ScenarioAnswer[]>([]);
  const stepRef = useFocusOnChange<HTMLHeadingElement>(`${scenarioId}-${answers.length}`);
  const language = analysis.language;
  const titles = new Map(analysis.points.map((point) => [point.id, point.title]));

  const scenario =
    analysis.scenarios.find((candidate) => candidate.id === scenarioId) ?? analysis.scenarios[0];
  if (!scenario) return <p className="empty-state">{t('whatIfNone')}</p>;

  const step = walkScenario(scenario, answers);
  const trail = answers.map((answer, depth) => {
    const node = walkScenario(scenario, answers.slice(0, depth));
    return { question: node.kind === 'question' ? node.node.question : '', answer };
  });

  const choose = (id: string): void => {
    setScenarioId(id);
    setAnswers([]);
  };

  return (
    <div className="whatif">
      <p className="lead">{t('whatIfIntro')}</p>

      <fieldset className="choice-group">
        <legend>{t('whatIfPick')}</legend>
        <div className="scenario-cards">
          {analysis.scenarios.map((candidate) => (
            <label key={candidate.id} className="scenario-card">
              <input
                type="radio"
                name="whatif-scenario"
                checked={candidate.id === scenario.id}
                onChange={() => choose(candidate.id)}
              />
              <Icon name="branch" />
              <span lang={language}>{candidate.title}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <section className="flow card" aria-live="polite">
        {trail.length > 0 && (
          <div>
            <h2 className="section-label">{t('yourAnswers')}</h2>
            <ol className="flow__trail">
              {trail.map((item, depth) => (
                <li key={depth} className="flow__node flow__node--done">
                  <span lang={language}>{item.question}</span>
                  <span className={`answer-pill answer-pill--${item.answer}`}>
                    {item.answer === 'yes' ? t('answerYes') : t('answerNo')}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {step.kind === 'question' ? (
          <div className="flow__current">
            <p className="section-label">{t('questionNumber', { n: step.depth + 1 })}</p>
            <h2 ref={stepRef} tabIndex={-1} className="flow__question" lang={language}>
              {step.node.question}
            </h2>
            <div className="flow__answers">
              <button
                type="button"
                className="big-answer big-answer--yes"
                onClick={() => setAnswers([...answers, 'yes'])}
              >
                <Icon name="check" /> {t('answerYes')}
              </button>
              <button
                type="button"
                className="big-answer big-answer--no"
                onClick={() => setAnswers([...answers, 'no'])}
              >
                <Icon name="ban" /> {t('answerNo')}
              </button>
            </div>
          </div>
        ) : (
          <div className={`outcome outcome--${step.outcome.tone}`}>
            <h2 ref={stepRef} tabIndex={-1} className="section-label">
              {t('outcomeHeading')}
            </h2>
            <p className="outcome__tone">
              <span className="outcome__icon">
                <Icon name={OUTCOME_STYLE[step.outcome.tone].icon} />
              </span>
              {t(OUTCOME_STYLE[step.outcome.tone].key)}
            </p>
            <p className="outcome__text" lang={language}>
              {step.outcome.text}
            </p>
            <SpeakButton
              id={`outcome-${scenario.id}`}
              text={step.outcome.text}
              language={language}
            />
            {step.outcome.pointIds.length > 0 && (
              <div className="related">
                <p className="section-label">{t('basedOn')}</p>
                <ul className="related__list">
                  {step.outcome.pointIds.map((id) => (
                    <li key={id}>
                      <button
                        type="button"
                        className="related__link"
                        onClick={() => onOpenPoint(id)}
                        lang={language}
                      >
                        {titles.get(id) ?? id} <Icon name="arrowRight" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {answers.length > 0 && (
          <div className="button-row">
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setAnswers(answers.slice(0, -1))}
            >
              <Icon name="arrowLeft" /> {t('back')}
            </button>
            <button type="button" className="button button--ghost" onClick={() => setAnswers([])}>
              <Icon name="refresh" /> {t('startAgain')}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
