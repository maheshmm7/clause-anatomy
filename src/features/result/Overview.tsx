import { useId, type RefObject } from 'react';
import type { AnalysisResult } from '../../../shared/schema';
import type { LoadedDocument } from '../../app/flow';
import { Icon } from '../../components/Icon';
import { LegalHelpCard, Notice, SpeakButton } from '../../components/ui';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages/en';
import { needsAttention, type Perspective } from '../../lib/perspective';
import { useSettings, type ReadingLevel } from '../../settings/SettingsProvider';

function UrgencyBanner({ level }: { level: AnalysisResult['urgency']['level'] }) {
  const { t } = useI18n();
  if (level === 'none') return null;
  const urgent = level === 'urgent';
  return (
    <Notice
      tone={urgent ? 'danger' : 'warning'}
      urgent={urgent}
      title={t(urgent ? 'urgentTitle' : 'soonTitle')}
    >
      <p>{t(urgent ? 'urgentBody' : 'soonBody')}</p>
      {urgent && (
        <a className="button button--danger" href="tel:15100">
          <Icon name="phone" /> {t('callLegalAid')}
        </a>
      )}
    </Notice>
  );
}

const NOTICE_FIELDS: readonly [keyof NonNullable<AnalysisResult['notice']>, MessageKey][] = [
  ['sender', 'noticeFrom'],
  ['claim', 'noticeClaim'],
  ['demand', 'noticeDemand'],
  ['deadline', 'noticeDeadline'],
  ['ifIgnored', 'noticeIfIgnored'],
];

function PerspectivePicker({
  analysis,
  perspective,
  onChange,
}: {
  analysis: AnalysisResult;
  perspective: Perspective;
  onChange: (perspective: Perspective) => void;
}) {
  const { t } = useI18n();
  const name = useId();
  const options = [
    ...analysis.parties.map((party) => ({ id: party.id, label: party.role, hint: party.name })),
    { id: null, label: t('perspectiveNone'), hint: '' },
  ];

  return (
    <fieldset className="choice-group">
      <legend>
        <Icon name="user" /> {t('perspectiveQuestion')}
      </legend>
      <div className="choice-group__options">
        {options.map((option) => (
          <label key={option.id ?? 'none'} className="choice">
            <input
              type="radio"
              name={name}
              checked={perspective === option.id}
              onChange={() => onChange(option.id)}
            />
            <span>
              <span lang={option.id ? analysis.language : undefined}>{option.label}</span>
              {option.hint && <span className="choice__hint">{option.hint}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ReadingLevelPicker() {
  const { t } = useI18n();
  const { readingLevel, setReadingLevel } = useSettings();
  const name = useId();
  const levels: readonly [ReadingLevel, MessageKey][] = [
    ['simple', 'levelSimple'],
    ['detailed', 'levelDetailed'],
  ];
  return (
    <fieldset className="choice-group choice-group--compact">
      <legend>{t('readingLevel')}</legend>
      <div className="choice-group__options">
        {levels.map(([level, key]) => (
          <label key={level} className="choice">
            <input
              type="radio"
              name={name}
              checked={readingLevel === level}
              onChange={() => setReadingLevel(level)}
            />
            <span>{t(key)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Overview({
  document,
  perspective,
  onPerspectiveChange,
  headingRef,
}: {
  document: LoadedDocument;
  perspective: Perspective;
  onPerspectiveChange: (perspective: Perspective) => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const { t, formatDate } = useI18n();
  const { analysis } = document;
  const language = analysis.language;
  const attention = analysis.points.filter((point) => needsAttention(point, perspective)).length;
  const unverified = analysis.points.filter((point) => !point.verified).length;
  const today = new Date().toISOString().slice(0, 10);
  const nextDate = analysis.keyDates.find((date) => date.date >= today);
  const isNotLegal = analysis.category === 'not-legal';

  return (
    <section className="overview stack" aria-labelledby="overview-heading">
      <p className="eyebrow">{t('resultHeading')}</p>
      <h1 id="overview-heading" ref={headingRef} tabIndex={-1} lang={language}>
        {analysis.documentType}
      </h1>

      <UrgencyBanner level={analysis.urgency.level} />

      <div className="summary card">
        <p className="summary__text" lang={language}>
          {analysis.summary}
        </p>
        <SpeakButton
          id="summary"
          text={`${analysis.documentType}. ${analysis.summary}`}
          language={language}
        />
      </div>

      {isNotLegal && (
        <Notice tone="info" title={t('notLegalTitle')}>
          {t('notLegalBody')}
        </Notice>
      )}
      {analysis.category === 'court' && (
        <>
          <Notice tone="warning" title={t('courtTitle')}>
            {t('courtBody')}
          </Notice>
          <LegalHelpCard />
        </>
      )}

      {analysis.notice && (
        <dl className="notice-summary card" lang={language}>
          {NOTICE_FIELDS.filter(([field]) => analysis.notice?.[field]).map(([field, key]) => (
            <div key={field} className="notice-summary__row">
              <dt>{t(key)}</dt>
              <dd>{analysis.notice?.[field]}</dd>
            </div>
          ))}
        </dl>
      )}

      {document.redactions > 0 && (
        <Notice
          tone="success"
          icon="lock"
          title={t('redactedCount', { count: document.redactions })}
        />
      )}
      {document.partialRead && <Notice tone="warning" title={t('partialReadWarning')} />}
      {document.languageFallback && <Notice tone="info" title={t('sampleFallbackNotice')} />}
      {unverified > 0 && (
        <Notice tone="warning" title={t('unverifiedCount', { count: unverified })} />
      )}

      {!isNotLegal && (
        <div className="overview__controls">
          {analysis.parties.length > 0 && (
            <PerspectivePicker
              analysis={analysis}
              perspective={perspective}
              onChange={onPerspectiveChange}
            />
          )}
          <ReadingLevelPicker />
        </div>
      )}

      {!isNotLegal && (
        <ul className="stats">
          <li className={attention > 0 ? 'stat stat--warning' : 'stat stat--success'}>
            <Icon name={attention > 0 ? 'alert' : 'checkCircle'} />
            {attention > 0 ? t('attentionCount', { count: attention }) : t('attentionNone')}
          </li>
          {nextDate && (
            <li className="stat">
              <Icon name="calendar" />
              <span>
                {t('nextDate', { date: formatDate(nextDate.date) })}{' '}
                <span lang={language}>— {nextDate.label}</span>
              </span>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
