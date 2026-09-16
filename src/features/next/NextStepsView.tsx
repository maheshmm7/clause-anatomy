import { useEffect, useState } from 'react';
import type { AnalysisResult } from '../../../shared/schema';
import { Icon } from '../../components/Icon';
import { LegalHelpCard } from '../../components/ui';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages/en';
import { buildBriefText, collectLawyerQuestions, type BriefInput } from '../../lib/brief';
import { downloadFile } from '../../lib/browser';
import { buildIcs } from '../../lib/ics';
import { groupDuties, partyLabel, type DutyItem, type Perspective } from '../../lib/perspective';

function DutyList({
  titleKey,
  items,
  analysis,
}: {
  titleKey: MessageKey;
  items: DutyItem[];
  analysis: AnalysisResult;
}) {
  const { t } = useI18n();
  if (items.length === 0) return null;
  return (
    <div className="duties__group">
      <h3>{t(titleKey)}</h3>
      <ul className="checklist" lang={analysis.language}>
        {items.map((item, index) => (
          <li key={`${item.pointId}-${index}`}>
            <Icon name="check" />
            <span>
              {item.action}
              {titleKey === 'dutiesOthers' && (
                <span className="muted"> ({partyLabel(analysis.parties, item.partyId)})</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NextStepsView({
  analysis,
  perspective,
  brief,
}: {
  analysis: AnalysisResult;
  perspective: Perspective;
  brief: BriefInput;
}) {
  const { t, formatDate } = useI18n();
  const [copied, setCopied] = useState(false);
  const duties = groupDuties(analysis.points, perspective);
  const questions = collectLawyerQuestions(brief, t);
  const checks = Object.values(brief.checks);
  const correct = checks.filter((outcome) => outcome === 'correct').length;
  const briefText = (): string => buildBriefText(brief, t, formatDate);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(briefText());
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const share = async (): Promise<void> => {
    try {
      await navigator.share({ title: analysis.documentType, text: briefText() });
    } catch {
      // The user closed the share sheet; nothing to do.
    }
  };

  const print = (): void => {
    document.body.classList.add('printing-brief');
    window.addEventListener('afterprint', () => document.body.classList.remove('printing-brief'), {
      once: true,
    });
    window.print();
  };

  const addToCalendar = (): void => {
    const events = analysis.keyDates.map((date) => ({
      date: date.date,
      summary: date.label,
      description: `${analysis.documentType} — Clause Anatomy`,
    }));
    downloadFile('legal-paper-dates.ics', 'text/calendar;charset=utf-8', buildIcs(events));
  };

  return (
    <div className="next stack">
      {checks.length > 0 && (
        <p className="stat stat--success">
          <Icon name="checkCircle" /> {t('understoodProgress', { correct, total: checks.length })}
        </p>
      )}

      <section className="card stack" aria-labelledby="duties-heading">
        <h2 id="duties-heading" className="card__title">
          <Icon name="check" /> {t('dutiesHeading')}
        </h2>
        {perspective === null ? (
          <p className="muted">{t('choosePerspectiveHint')}</p>
        ) : (
          <div className="duties">
            <DutyList titleKey="dutiesYouMust" items={duties.youMust} analysis={analysis} />
            <DutyList titleKey="dutiesYouMustNot" items={duties.youMustNot} analysis={analysis} />
            <DutyList titleKey="dutiesYouMay" items={duties.youMay} analysis={analysis} />
            <DutyList titleKey="dutiesOthers" items={duties.othersMust} analysis={analysis} />
          </div>
        )}
      </section>

      <section className="card stack" aria-labelledby="dates-heading">
        <h2 id="dates-heading" className="card__title">
          <Icon name="calendar" /> {t('datesHeading')}
        </h2>
        {analysis.keyDates.length === 0 ? (
          <p className="muted">{t('noDates')}</p>
        ) : (
          <>
            <ul className="dates">
              {analysis.keyDates.map((date) => (
                <li key={`${date.date}-${date.label}`}>
                  <time dateTime={date.date}>{formatDate(date.date)}</time>
                  <span lang={analysis.language}>{date.label}</span>
                </li>
              ))}
            </ul>
            <button type="button" className="button button--secondary" onClick={addToCalendar}>
              <Icon name="calendar" /> {t('addToCalendar')}
            </button>
          </>
        )}
      </section>

      <section className="card stack brief" aria-labelledby="brief-heading">
        <h2 id="brief-heading" className="card__title">
          <Icon name="help" /> {t('briefHeading')}
        </h2>
        <p className="muted">{t('briefHint')}</p>
        <ol className="brief__questions">
          {questions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ol>
        <div className="button-row no-print">
          <button type="button" className="button button--secondary" onClick={() => void copy()}>
            <Icon name={copied ? 'check' : 'copy'} /> {copied ? t('copied') : t('copyBrief')}
          </button>
          {typeof navigator.share === 'function' && (
            <button type="button" className="button button--secondary" onClick={() => void share()}>
              <Icon name="share" /> {t('shareBrief')}
            </button>
          )}
          <button type="button" className="button button--secondary" onClick={print}>
            <Icon name="print" /> {t('printBrief')}
          </button>
        </div>
        <p className="visually-hidden" role="status">
          {copied ? t('copied') : ''}
        </p>
      </section>

      <LegalHelpCard />
    </div>
  );
}
