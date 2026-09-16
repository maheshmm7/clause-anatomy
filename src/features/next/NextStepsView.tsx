import { useEffect, useState } from 'react';
import type { AnalysisResult } from '../../../shared/schema';
import { Icon, type IconName } from '../../components/Icon';
import { LegalHelpCard } from '../../components/ui';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages/en';
import { buildBriefText, collectLawyerQuestions, type BriefInput } from '../../lib/brief';
import { downloadFile } from '../../lib/browser';
import { buildIcs } from '../../lib/ics';
import { groupDuties, partyLabel, type DutyItem, type Perspective } from '../../lib/perspective';

function ProgressRing({ value, total }: { value: number; total: number }) {
  const { t } = useI18n();
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const ratio = total === 0 ? 0 : value / total;
  return (
    <div className="ring">
      <svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">
        <circle className="ring__track" cx="40" cy="40" r={radius} />
        <circle
          className="ring__value"
          cx="40"
          cy="40"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
        />
      </svg>
      <span className="ring__label">
        <strong>
          {value}/{total}
        </strong>
        <span>{t('understoodLabel')}</span>
      </span>
    </div>
  );
}

function DutyList({
  titleKey,
  icon,
  tone,
  items,
  analysis,
  done,
  onToggle,
}: {
  titleKey: MessageKey;
  icon: IconName;
  tone: string;
  items: DutyItem[];
  analysis: AnalysisResult;
  done: ReadonlySet<string>;
  onToggle: (key: string) => void;
}) {
  const { t } = useI18n();
  if (items.length === 0) return null;
  return (
    <div className={`duties__group duties__group--${tone}`}>
      <h3>
        <Icon name={icon} /> {t(titleKey)}
      </h3>
      <ul className="checklist" lang={analysis.language}>
        {items.map((item, index) => {
          const key = `${titleKey}-${item.pointId}-${index}`;
          const checked = done.has(key);
          return (
            <li key={key}>
              <label className={`check-item${checked ? ' check-item--done' : ''}`}>
                <input type="checkbox" checked={checked} onChange={() => onToggle(key)} />
                <span>
                  {item.action}
                  {titleKey === 'dutiesOthers' && (
                    <span className="muted"> ({partyLabel(analysis.parties, item.partyId)})</span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
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
  const [done, setDone] = useState<ReadonlySet<string>>(() => new Set());
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

  const toggle = (key: string): void =>
    setDone((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

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

  const listProps = { analysis, done, onToggle: toggle };

  return (
    <div className="next">
      {checks.length > 0 && (
        <div className="progress-card card">
          <ProgressRing value={correct} total={checks.length} />
          <p className="progress-card__text">
            {t('understoodProgress', { correct, total: checks.length })}
          </p>
        </div>
      )}

      <section className="card panel panel--wide" aria-labelledby="duties-heading">
        <h2 id="duties-heading" className="panel__title">
          <span className="panel__icon panel__icon--indigo">
            <Icon name="checkCircle" />
          </span>
          {t('dutiesHeading')}
        </h2>
        {perspective === null ? (
          <p className="muted">{t('choosePerspectiveHint')}</p>
        ) : (
          <>
            <p className="muted small">{t('checklistHint')}</p>
            <div className="duties">
              <DutyList
                titleKey="dutiesYouMust"
                icon="checkCircle"
                tone="must"
                items={duties.youMust}
                {...listProps}
              />
              <DutyList
                titleKey="dutiesYouMustNot"
                icon="ban"
                tone="must-not"
                items={duties.youMustNot}
                {...listProps}
              />
              <DutyList
                titleKey="dutiesYouMay"
                icon="key"
                tone="may"
                items={duties.youMay}
                {...listProps}
              />
              <DutyList
                titleKey="dutiesOthers"
                icon="user"
                tone="others"
                items={duties.othersMust}
                {...listProps}
              />
            </div>
          </>
        )}
      </section>

      <section className="card panel" aria-labelledby="dates-heading">
        <h2 id="dates-heading" className="panel__title">
          <span className="panel__icon panel__icon--saffron">
            <Icon name="calendar" />
          </span>
          {t('datesHeading')}
        </h2>
        {analysis.keyDates.length === 0 ? (
          <p className="muted">{t('noDates')}</p>
        ) : (
          <>
            <ol className="timeline">
              {analysis.keyDates.map((date) => (
                <li key={`${date.date}-${date.label}`} className="timeline__item">
                  <time dateTime={date.date}>{formatDate(date.date)}</time>
                  <span lang={analysis.language}>{date.label}</span>
                </li>
              ))}
            </ol>
            <button type="button" className="button button--secondary" onClick={addToCalendar}>
              <Icon name="calendar" /> {t('addToCalendar')}
            </button>
          </>
        )}
      </section>

      <LegalHelpCard />

      <section className="card panel brief" aria-labelledby="brief-heading">
        <h2 id="brief-heading" className="panel__title">
          <span className="panel__icon panel__icon--violet">
            <Icon name="chat" />
          </span>
          {t('briefHeading')}
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
    </div>
  );
}
