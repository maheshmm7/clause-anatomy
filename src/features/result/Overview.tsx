import { useId, type RefObject } from 'react';
import type { AnalysisResult, DocumentCategory } from '../../../shared/schema';
import type { LoadedDocument } from '../../app/flow';
import { Icon, type IconName } from '../../components/Icon';
import { LegalHelpCard, Notice, SpeakButton } from '../../components/ui';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages/en';
import { needsAttention, type Perspective } from '../../lib/perspective';
import { useSettings, type ReadingLevel } from '../../settings/SettingsProvider';

const CATEGORY_ICONS: Record<DocumentCategory, IconName> = {
  contract: 'document',
  notice: 'alert',
  court: 'scale',
  policy: 'shield',
  'other-legal': 'layers',
  'not-legal': 'help',
};

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

const NOTICE_FIELDS: readonly [
  keyof NonNullable<AnalysisResult['notice']>,
  MessageKey,
  IconName,
][] = [
  ['sender', 'noticeFrom', 'user'],
  ['claim', 'noticeClaim', 'chat'],
  ['demand', 'noticeDemand', 'alert'],
  ['deadline', 'noticeDeadline', 'clock'],
  ['ifIgnored', 'noticeIfIgnored', 'scale'],
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
    ...analysis.parties.map((party) => ({
      id: party.id,
      label: party.role,
      hint: party.name,
      icon: 'user' as IconName,
    })),
    { id: null, label: t('perspectiveNone'), hint: '', icon: 'document' as IconName },
  ];

  return (
    <fieldset className="choice-group">
      <legend>
        <Icon name="user" /> {t('perspectiveQuestion')}
      </legend>
      <div className="role-cards">
        {options.map((option) => (
          <label key={option.id ?? 'none'} className="role-card">
            <input
              type="radio"
              name={name}
              checked={perspective === option.id}
              onChange={() => onChange(option.id)}
            />
            <span className="role-card__icon">
              <Icon name={option.icon} />
            </span>
            <span className="role-card__text">
              <span className="role-card__label" lang={option.id ? analysis.language : undefined}>
                {option.label}
              </span>
              {option.hint && <span className="role-card__hint">{option.hint}</span>}
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
    <fieldset className="choice-group">
      <legend>{t('readingLevel')}</legend>
      <div className="segmented">
        {levels.map(([level, key]) => (
          <label key={level} className="segmented__option">
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
  const verified = analysis.points.filter((point) => point.verified).length;
  const unverified = analysis.points.length - verified;
  const today = new Date().toISOString().slice(0, 10);
  const nextDate = analysis.keyDates.find((date) => date.date >= today);
  const isNotLegal = analysis.category === 'not-legal';

  return (
    <section className="overview" aria-labelledby="overview-heading">
      <div className="summary-hero">
        <div className="summary-hero__top">
          <span className="chip chip--glass">
            <Icon name={CATEGORY_ICONS[analysis.category]} /> {t('resultHeading')}
          </span>
          <SpeakButton
            id="summary"
            text={`${analysis.documentType}. ${analysis.summary}`}
            language={language}
          />
        </div>
        <h1 id="overview-heading" ref={headingRef} tabIndex={-1} lang={language}>
          {analysis.documentType}
        </h1>
        <p className="summary-hero__text" lang={language}>
          {analysis.summary}
        </p>
      </div>

      <UrgencyBanner level={analysis.urgency.level} />

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
        <dl className="notice-grid" lang={language}>
          {NOTICE_FIELDS.filter(([field]) => analysis.notice?.[field]).map(([field, key, icon]) => (
            <div key={field} className={`notice-grid__item notice-grid__item--${field}`}>
              <dt>
                <Icon name={icon} /> {t(key)}
              </dt>
              <dd>{analysis.notice?.[field]}</dd>
            </div>
          ))}
        </dl>
      )}

      {!isNotLegal && (
        <ul className="stat-grid">
          <li className="stat-tile stat-tile--indigo">
            <Icon name="layers" className="stat-tile__icon" />
            <span className="stat-tile__value">{analysis.points.length}</span>
            <span className="stat-tile__label">{t('statPoints')}</span>
          </li>
          <li className={`stat-tile ${attention > 0 ? 'stat-tile--rose' : 'stat-tile--emerald'}`}>
            <Icon name={attention > 0 ? 'alert' : 'checkCircle'} className="stat-tile__icon" />
            <span className="stat-tile__value">{attention}</span>
            <span className="stat-tile__label">{t('statAttention')}</span>
          </li>
          <li className="stat-tile stat-tile--emerald">
            <Icon name="shieldCheck" className="stat-tile__icon" />
            <span className="stat-tile__value">
              {verified}/{analysis.points.length}
            </span>
            <span className="stat-tile__label">{t('statVerified')}</span>
          </li>
          {nextDate && (
            <li className="stat-tile stat-tile--saffron">
              <Icon name="calendar" className="stat-tile__icon" />
              <span className="stat-tile__value stat-tile__value--date">
                {formatDate(nextDate.date)}
              </span>
              <span className="stat-tile__label">
                {t('statNextDate')} · <span lang={language}>{nextDate.label}</span>
              </span>
            </li>
          )}
        </ul>
      )}

      <div className="overview__notices">
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
      </div>

      {!isNotLegal && (
        <div className="overview__controls card">
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
    </section>
  );
}
