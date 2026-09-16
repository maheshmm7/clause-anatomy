import { useState } from 'react';
import type { AnalysisResult, ScenarioOutcome } from '../../../shared/schema';
import { walkScenario, type ScenarioAnswer } from '../../../shared/scenario';
import { Icon } from '../../components/Icon';
import { Notice, SpeakButton, type Tone } from '../../components/ui';
import { useFocusOnChange } from '../../hooks/dom';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages/en';

const OUTCOME_STYLE: Record<ScenarioOutcome['tone'], { tone: Tone; key: MessageKey }> = {
  good: { tone: 'success', key: 'toneGood' },
  caution: { tone: 'warning', key: 'toneCaution' },
  bad: { tone: 'danger', key: 'toneBad' },
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
  if (!scenario) return <p className="muted">{t('whatIfNone')}</p>;

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
    <div className="whatif stack">
      <p className="lead">{t('whatIfIntro')}</p>

      <fieldset className="choice-group">
        <legend>{t('whatIfPick')}</legend>
        <div className="choice-group__options choice-group__options--stacked">
          {analysis.scenarios.map((candidate) => (
            <label key={candidate.id} className="choice">
              <input
                type="radio"
                name="whatif-scenario"
                checked={candidate.id === scenario.id}
                onChange={() => choose(candidate.id)}
              />
              <span lang={language}>{candidate.title}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <section className="card stack" aria-live="polite">
        {trail.length > 0 && (
          <div>
            <h2 className="section-label">{t('yourAnswers')}</h2>
            <ol className="trail">
              {trail.map((item, depth) => (
                <li key={depth}>
                  <span lang={language}>{item.question}</span>{' '}
                  <strong>{item.answer === 'yes' ? t('answerYes') : t('answerNo')}</strong>
                </li>
              ))}
            </ol>
          </div>
        )}

        {step.kind === 'question' ? (
          <>
            <p className="section-label">{t('questionNumber', { n: step.depth + 1 })}</p>
            <h2 ref={stepRef} tabIndex={-1} className="whatif__question" lang={language}>
              {step.node.question}
            </h2>
            <div className="button-row">
              <button
                type="button"
                className="button button--primary button--large"
                onClick={() => setAnswers([...answers, 'yes'])}
              >
                {t('answerYes')}
              </button>
              <button
                type="button"
                className="button button--primary button--large"
                onClick={() => setAnswers([...answers, 'no'])}
              >
                {t('answerNo')}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 ref={stepRef} tabIndex={-1} className="section-label">
              {t('outcomeHeading')}
            </h2>
            <Notice
              tone={OUTCOME_STYLE[step.outcome.tone].tone}
              title={t(OUTCOME_STYLE[step.outcome.tone].key)}
            >
              <p lang={language}>{step.outcome.text}</p>
            </Notice>
            <SpeakButton
              id={`outcome-${scenario.id}`}
              text={step.outcome.text}
              language={language}
            />
            {step.outcome.pointIds.length > 0 && (
              <div>
                <p className="section-label">{t('basedOn')}</p>
                <ul className="related__list">
                  {step.outcome.pointIds.map((id) => (
                    <li key={id}>
                      <button
                        type="button"
                        className="button button--link"
                        onClick={() => onOpenPoint(id)}
                        lang={language}
                      >
                        <Icon name="arrowRight" /> {titles.get(id) ?? id}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
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
