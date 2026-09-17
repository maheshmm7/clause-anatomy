import { useState } from 'react';
import type { ScenarioOutcome } from '../../../shared/schema';
import { walkScenario, type ScenarioAnswer } from '../../../shared/scenario';
import { useActiveDoc } from '../../app/WorkspaceContext';
import { Icon, type IconName } from '../../components/Icon';
import { SpeakButton, ViewHeader } from '../../components/ui';
import { useFocusOnChange, useFocusOnMount } from '../../hooks/dom';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages/en';

const OUTCOME_STYLE: Record<ScenarioOutcome['tone'], { key: MessageKey; icon: IconName }> = {
  good: { key: 'toneGood', icon: 'checkCircle' },
  caution: { key: 'toneCaution', icon: 'alert' },
  bad: { key: 'toneBad', icon: 'ban' },
};

/**
 * 05 — "What if…?" simulator. The decision tree comes from the analysis, but walking
 * it is plain deterministic code (shared/scenario.ts): same answers, same outcome.
 */
export function WhatIfView() {
  const { t } = useI18n();
  const { doc, go } = useActiveDoc();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const { analysis } = doc.loaded;
  const [scenarioId, setScenarioId] = useState<string | null>(analysis.scenarios[0]?.id ?? null);
  const [answers, setAnswers] = useState<ScenarioAnswer[]>([]);
  const stepRef = useFocusOnChange<HTMLHeadingElement>(`${scenarioId}-${answers.length}`);
  const language = analysis.language;
  const titles = new Map(analysis.points.map((point) => [point.id, point.title]));
  const scenario =
    analysis.scenarios.find((candidate) => candidate.id === scenarioId) ?? analysis.scenarios[0];

  const header = (
    <ViewHeader number="05" kicker={t('navWhatIf')} title={t('navWhatIf')} headingRef={headingRef}>
      <p className="view-header__lead">{t('whatIfIntro')}</p>
    </ViewHeader>
  );

  if (!scenario) {
    return (
      <div className="view">
        {header}
        <p className="empty">{t('whatIfNone')}</p>
      </div>
    );
  }

  const step = walkScenario(scenario, answers);
  const trail = answers.map((answer, depth) => {
    const node = walkScenario(scenario, answers.slice(0, depth));
    return { question: node.kind === 'question' ? node.node.question : '', answer };
  });

  return (
    <div className="view">
      {header}
      <div className="whatif">
        <fieldset className="scenarios">
          <legend className="sub-label">{t('whatIfPick')}</legend>
          {analysis.scenarios.map((candidate, index) => (
            <label key={candidate.id} className="scenario">
              <input
                type="radio"
                name="whatif-scenario"
                checked={candidate.id === scenario.id}
                onChange={() => {
                  setScenarioId(candidate.id);
                  setAnswers([]);
                }}
              />
              <span className="scenario__index" aria-hidden="true">
                S{index + 1}
              </span>
              <span className="scenario__title" lang={language}>
                {candidate.title}
              </span>
            </label>
          ))}
        </fieldset>

        <section className="flow" aria-live="polite">
          {trail.length > 0 && (
            <div className="flow__trail">
              <h2 className="sub-label">{t('yourAnswers')}</h2>
              <ol>
                {trail.map((item, depth) => (
                  <li key={depth} className="flow__node">
                    <span className="flow__depth" aria-hidden="true">
                      Q{depth + 1}
                    </span>
                    <span lang={language}>{item.question}</span>
                    <span className={`answer-tag answer-tag--${item.answer}`}>
                      {item.answer === 'yes' ? t('answerYes') : t('answerNo')}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {step.kind === 'question' ? (
            <div className="flow__question">
              <p className="sub-label">{t('questionNumber', { n: step.depth + 1 })}</p>
              <h2 ref={stepRef} tabIndex={-1} className="flow__title" lang={language}>
                {step.node.question}
              </h2>
              <div className="flow__answers">
                <button
                  type="button"
                  className="decision decision--yes"
                  onClick={() => setAnswers([...answers, 'yes'])}
                >
                  <Icon name="check" /> {t('answerYes')}
                </button>
                <button
                  type="button"
                  className="decision decision--no"
                  onClick={() => setAnswers([...answers, 'no'])}
                >
                  <Icon name="ban" /> {t('answerNo')}
                </button>
              </div>
            </div>
          ) : (
            <div className={`verdict verdict--${step.outcome.tone}`}>
              <h2 ref={stepRef} tabIndex={-1} className="sub-label">
                {t('outcomeHeading')}
              </h2>
              <p className="verdict__tone">
                <Icon name={OUTCOME_STYLE[step.outcome.tone].icon} />
                {t(OUTCOME_STYLE[step.outcome.tone].key)}
              </p>
              <p className="verdict__text" lang={language}>
                {step.outcome.text}
              </p>
              <SpeakButton
                id={`outcome-${scenario.id}`}
                text={step.outcome.text}
                language={language}
              />
              {step.outcome.pointIds.length > 0 && (
                <div className="related">
                  <p className="sub-label">{t('basedOn')}</p>
                  <ul className="related__list">
                    {step.outcome.pointIds.map((id) => (
                      <li key={id}>
                        <button
                          type="button"
                          className="related__link"
                          onClick={() => go('clauses', { pointId: id })}
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
                className="btn"
                onClick={() => setAnswers(answers.slice(0, -1))}
              >
                <Icon name="arrowLeft" /> {t('back')}
              </button>
              <button type="button" className="btn" onClick={() => setAnswers([])}>
                <Icon name="refresh" /> {t('startAgain')}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
