import { useEffect, useState } from 'react';
import { useActiveDoc } from '../../app/WorkspaceContext';
import { RolePicker, useCountdown } from '../../components/controls';
import { Icon, type IconName } from '../../components/Icon';
import { Badge, LegalHelpPanel, Panel, ViewHeader } from '../../components/ui';
import { useFocusOnMount } from '../../hooks/dom';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages/en';
import { buildBriefText, collectLawyerQuestions, type BriefInput } from '../../lib/brief';
import { downloadFile } from '../../lib/browser';
import { buildIcs } from '../../lib/ics';
import { daysUntil } from '../../lib/insights';
import { groupDuties, partyLabel, type DutyItem } from '../../lib/perspective';

function ProgressRing({ value, total }: { value: number; total: number }) {
  const { t } = useI18n();
  const ratio = total === 0 ? 0 : value / total;
  return (
    <div
      className="meter"
      role="img"
      aria-label={t('understoodProgress', { correct: value, total })}
    >
      <span className="meter__fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
      <span className="meter__text">
        {value}/{total} {t('understoodLabel')}
      </span>
    </div>
  );
}

function DutyGroup({
  titleKey,
  icon,
  tone,
  items,
  done,
  onToggle,
}: {
  titleKey: MessageKey;
  icon: IconName;
  tone: string;
  items: DutyItem[];
  done: ReadonlySet<string>;
  onToggle: (key: string) => void;
}) {
  const { t } = useI18n();
  const { doc } = useActiveDoc();
  const { analysis } = doc.loaded;
  if (items.length === 0) return null;
  return (
    <div className={`duties__group duties__group--${tone}`}>
      <h3 className="duties__title">
        <Icon name={icon} /> {t(titleKey)}
      </h3>
      <ul className="checklist" lang={analysis.language}>
        {items.map((item, index) => {
          const key = `${titleKey}-${item.pointId}-${index}`;
          const checked = done.has(key);
          return (
            <li key={key}>
              <label className={`check${checked ? ' check--done' : ''}`}>
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

/** 08 — what to do next: checklist, dates, the lawyer brief and free legal help. */
export function PlanView() {
  const { t, formatDate } = useI18n();
  const { doc, dispatch } = useActiveDoc();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const countdown = useCountdown();
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState<ReadonlySet<string>>(() => new Set());
  const { analysis } = doc.loaded;
  const today = new Date().toISOString().slice(0, 10);

  const brief: BriefInput = {
    analysis,
    checks: doc.checks,
    notes: doc.notes,
    flags: doc.flags,
    asked: doc.asks.flatMap((entry) =>
      entry.result ? [{ question: entry.question, basis: entry.result.basis }] : [],
    ),
  };
  const duties = groupDuties(analysis.points, doc.perspective);
  const questions = collectLawyerQuestions(brief, t);
  const checks = Object.values(doc.checks);
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

  return (
    <div className="view">
      <ViewHeader number="08" kicker={t('navPlan')} title={t('planTitle')} headingRef={headingRef}>
        {checks.length > 0 && <ProgressRing value={correct} total={checks.length} />}
      </ViewHeader>

      <div className="dash-grid">
        <Panel number="08A" title={t('dutiesHeading')} icon="checkCircle" className="panel--wide">
          {doc.perspective === null ? (
            <RolePicker
              analysis={analysis}
              perspective={doc.perspective}
              onChange={(perspective) => dispatch({ type: 'setPerspective', perspective })}
            />
          ) : (
            <>
              <p className="hint">{t('checklistHint')}</p>
              <div className="duties">
                <DutyGroup
                  titleKey="dutiesYouMust"
                  icon="checkCircle"
                  tone="must"
                  items={duties.youMust}
                  done={done}
                  onToggle={toggle}
                />
                <DutyGroup
                  titleKey="dutiesYouMustNot"
                  icon="ban"
                  tone="must-not"
                  items={duties.youMustNot}
                  done={done}
                  onToggle={toggle}
                />
                <DutyGroup
                  titleKey="dutiesYouMay"
                  icon="key"
                  tone="may"
                  items={duties.youMay}
                  done={done}
                  onToggle={toggle}
                />
                <DutyGroup
                  titleKey="dutiesOthers"
                  icon="user"
                  tone="others"
                  items={duties.othersMust}
                  done={done}
                  onToggle={toggle}
                />
              </div>
            </>
          )}
        </Panel>

        <Panel number="08B" title={t('datesHeading')} icon="calendar">
          {analysis.keyDates.length === 0 ? (
            <p className="empty">{t('noDates')}</p>
          ) : (
            <>
              <ol className="timeline">
                {analysis.keyDates.map((date) => {
                  const days = daysUntil(date.date, today);
                  return (
                    <li
                      key={`${date.date}-${date.label}`}
                      className={`timeline__item${days < 0 ? ' timeline__item--past' : ''}`}
                    >
                      <time dateTime={date.date}>{formatDate(date.date)}</time>
                      <span lang={analysis.language}>{date.label}</span>
                      <Badge tone={days < 0 ? 'neutral' : 'ink'}>{countdown(days)}</Badge>
                    </li>
                  );
                })}
              </ol>
              <button type="button" className="btn" onClick={addToCalendar}>
                <Icon name="calendar" /> {t('addToCalendar')}
              </button>
            </>
          )}
        </Panel>

        <LegalHelpPanel number="08C" />

        <Panel number="08D" title={t('briefHeading')} icon="chat" className="panel--wide brief">
          <p className="hint">{t('briefHint')}</p>
          <ol className="brief__questions">
            {questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ol>
          <div className="button-row no-print">
            <button type="button" className="btn" onClick={() => void copy()}>
              <Icon name={copied ? 'check' : 'copy'} /> {copied ? t('copied') : t('copyBrief')}
            </button>
            {typeof navigator.share === 'function' && (
              <button type="button" className="btn" onClick={() => void share()}>
                <Icon name="share" /> {t('shareBrief')}
              </button>
            )}
            <button
              type="button"
              className="btn"
              onClick={() =>
                downloadFile('lawyer-questions.txt', 'text/plain;charset=utf-8', briefText())
              }
            >
              <Icon name="download" /> {t('downloadBrief')}
            </button>
            <button type="button" className="btn" onClick={print}>
              <Icon name="print" /> {t('printBrief')}
            </button>
          </div>
          <p className="visually-hidden" role="status">
            {copied ? t('copied') : ''}
          </p>
        </Panel>
      </div>
    </div>
  );
}
