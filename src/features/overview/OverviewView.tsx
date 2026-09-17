import {
  EXPLANATION_LANGUAGES,
  LANGUAGE_INFO,
  type ExplanationLanguage,
} from '../../../shared/languages';
import type { AnalysisResult } from '../../../shared/schema';
import { useActiveDoc } from '../../app/WorkspaceContext';
import { FairnessBar, RolePicker, useCountdown } from '../../components/controls';
import { Icon, type IconName } from '../../components/Icon';
import { Select } from '../../components/Select';
import { Badge, LegalHelpPanel, Notice, Panel, SpeakButton, ViewHeader } from '../../components/ui';
import { useFocusOnMount } from '../../hooks/dom';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages/en';
import { daysUntil } from '../../lib/insights';
import { needsAttention } from '../../lib/perspective';

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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 01 — the paper at a glance: KPIs, role, balance, risks, dates and next moves. */
export function OverviewView() {
  const { t, formatDate, language: uiLanguage } = useI18n();
  const { doc, dispatch, go, explainAgain } = useActiveDoc();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const countdown = useCountdown();
  const { loaded, perspective, checks } = doc;
  const { analysis } = loaded;
  const language = analysis.language;
  const today = todayIso();

  const attentionPoints = analysis.points.filter((point) => needsAttention(point, perspective));
  const verified = analysis.points.filter((point) => point.verified).length;
  const checkable = analysis.points.filter((point) => point.check).length;
  const understood = Object.values(checks).filter((outcome) => outcome === 'correct').length;
  const upcoming = analysis.keyDates.filter((date) => date.date >= today);
  const nextDate = upcoming[0];
  const isNotLegal = analysis.category === 'not-legal';
  const urgent = analysis.urgency.level === 'urgent';

  return (
    <div className="view">
      <ViewHeader
        number="01"
        kicker={t('overviewEyebrow')}
        title={analysis.documentType}
        titleLang={language}
        headingRef={headingRef}
        actions={
          <>
            <Select<ExplanationLanguage>
              label={t('explanationLanguageLabel')}
              hideLabel
              compact
              buttonIcon="globe"
              value={language}
              options={EXPLANATION_LANGUAGES.map((option) => ({
                value: option,
                label: LANGUAGE_INFO[option].nativeName,
                hint: option === 'en' ? undefined : LANGUAGE_INFO[option].englishName,
                lang: option,
              }))}
              onChange={explainAgain}
            />
            <SpeakButton
              id="summary"
              text={`${analysis.documentType}. ${analysis.summary}`}
              language={language}
            />
          </>
        }
      >
        <p className="view-header__lead" lang={language}>
          {analysis.summary}
        </p>
      </ViewHeader>

      {analysis.urgency.level !== 'none' && (
        <Notice
          tone={urgent ? 'danger' : 'warning'}
          urgent={urgent}
          title={t(urgent ? 'urgentTitle' : 'soonTitle')}
        >
          <p>{t(urgent ? 'urgentBody' : 'soonBody')}</p>
          {analysis.urgency.reason && <p lang={language}>{analysis.urgency.reason}</p>}
          {urgent && (
            <a className="btn btn--danger" href="tel:15100">
              <Icon name="phone" /> {t('callLegalAid')}
            </a>
          )}
        </Notice>
      )}
      {isNotLegal && (
        <Notice tone="info" title={t('notLegalTitle')}>
          <p>{t('notLegalBody')}</p>
          <button type="button" className="btn btn--primary" onClick={() => go('home')}>
            <Icon name="plus" /> {t('newDocument')}
          </button>
        </Notice>
      )}
      {analysis.category === 'court' && (
        <Notice tone="warning" title={t('courtTitle')}>
          {t('courtBody')}
        </Notice>
      )}

      <div className="notices">
        {loaded.redactions > 0 && (
          <Notice
            tone="success"
            icon="lock"
            title={t('redactedCount', { count: loaded.redactions })}
          />
        )}
        {loaded.partialRead && <Notice tone="warning" title={t('partialReadWarning')} />}
        {loaded.languageFallback && <Notice tone="info" title={t('sampleFallbackNotice')} />}
        {!loaded.languageFallback && language !== uiLanguage && (
          <Notice
            tone="info"
            icon="globe"
            title={t('explainedIn', { language: LANGUAGE_INFO[language].nativeName })}
          />
        )}
        {verified < analysis.points.length && (
          <Notice
            tone="warning"
            title={t('unverifiedCount', { count: analysis.points.length - verified })}
          />
        )}
      </div>

      {!isNotLegal && (
        <>
          <ul className="kpis">
            <li className="kpi">
              <span className="kpi__label">{t('kpiClauses')}</span>
              <span className="kpi__value">{analysis.points.length}</span>
            </li>
            <li className={`kpi${attentionPoints.length > 0 ? ' kpi--danger' : ' kpi--ok'}`}>
              <span className="kpi__label">{t('kpiAttention')}</span>
              <span className="kpi__value">{attentionPoints.length}</span>
            </li>
            <li className="kpi kpi--ok">
              <span className="kpi__label">{t('kpiVerified')}</span>
              <span className="kpi__value">
                {Math.round((verified / Math.max(1, analysis.points.length)) * 100)}%
              </span>
            </li>
            <li className="kpi">
              <span className="kpi__label">{t('kpiUnderstood')}</span>
              <span className="kpi__value">
                {understood}
                <small>/{checkable}</small>
              </span>
            </li>
            <li className="kpi kpi--accent">
              <span className="kpi__label">{t('kpiNextDate')}</span>
              {nextDate ? (
                <>
                  <span className="kpi__value kpi__value--text">
                    {countdown(daysUntil(nextDate.date, today))}
                  </span>
                  <span className="kpi__note">{formatDate(nextDate.date)}</span>
                </>
              ) : (
                <span className="kpi__value">—</span>
              )}
            </li>
          </ul>

          <div className="dash-grid">
            <Panel
              number="01A"
              title={t('perspectiveQuestion')}
              icon="user"
              className="panel--wide"
            >
              <RolePicker
                hideLegend
                analysis={analysis}
                perspective={perspective}
                onChange={(next) => dispatch({ type: 'setPerspective', perspective: next })}
              />
            </Panel>

            <Panel number="01B" title={t('fairnessTitle')} icon="scale">
              <FairnessBar analysis={analysis} perspective={perspective} />
            </Panel>

            <Panel number="01C" title={t('topRisksTitle')} icon="alert" className="panel--danger">
              {attentionPoints.length === 0 ? (
                <p className="empty">{t('topRisksEmpty')}</p>
              ) : (
                <ol className="link-list">
                  {attentionPoints.slice(0, 5).map((point) => (
                    <li key={point.id}>
                      <button
                        type="button"
                        className="link-list__item"
                        onClick={() => go('clauses', { pointId: point.id })}
                      >
                        <span className="link-list__number">
                          {String(analysis.points.indexOf(point) + 1).padStart(2, '0')}
                        </span>
                        <span lang={language}>{point.title}</span>
                        <Icon name="arrowRight" />
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>

            <Panel number="01D" title={t('datesTitle')} icon="calendar">
              {analysis.keyDates.length === 0 ? (
                <p className="empty">{t('noDates')}</p>
              ) : (
                <ol className="timeline">
                  {analysis.keyDates.map((date) => {
                    const days = daysUntil(date.date, today);
                    return (
                      <li
                        key={`${date.date}-${date.label}`}
                        className={`timeline__item${days < 0 ? ' timeline__item--past' : ''}`}
                      >
                        <time dateTime={date.date}>{formatDate(date.date)}</time>
                        <span lang={language}>{date.label}</span>
                        <Badge tone={days < 0 ? 'neutral' : days <= 30 ? 'warning' : 'ink'}>
                          {countdown(days)}
                        </Badge>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Panel>

            {analysis.notice && (
              <Panel number="01E" title={t('noticeDemand')} icon="alert" className="panel--wide">
                <dl className="facts" lang={language}>
                  {NOTICE_FIELDS.filter(([field]) => analysis.notice?.[field]).map(
                    ([field, key, icon]) => (
                      <div key={field} className={`facts__row facts__row--${field}`}>
                        <dt>
                          <Icon name={icon} /> {t(key)}
                        </dt>
                        <dd>{analysis.notice?.[field]}</dd>
                      </div>
                    ),
                  )}
                </dl>
              </Panel>
            )}

            <Panel number="01F" title={t('partiesTitle')} icon="user">
              <ul className="parties">
                {analysis.parties.map((party) => (
                  <li key={party.id} className="parties__item">
                    <span className="parties__role" lang={language}>
                      {party.role}
                    </span>
                    <span className="parties__name">{party.name}</span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel number="01G" title={t('quickActionsTitle')} icon="arrowRight">
              <ul className="action-list">
                <li>
                  <button type="button" className="btn btn--primary" onClick={() => go('clauses')}>
                    <Icon name="list" /> {t('actionReadClauses')}
                  </button>
                </li>
                <li>
                  <button type="button" className="btn" onClick={() => go('whatif')}>
                    <Icon name="branch" /> {t('actionSimulate')}
                  </button>
                </li>
                <li>
                  <button type="button" className="btn" onClick={() => go('ask')}>
                    <Icon name="chat" /> {t('actionAsk')}
                  </button>
                </li>
                <li>
                  <button type="button" className="btn" onClick={() => go('plan')}>
                    <Icon name="checkCircle" /> {t('actionBrief')}
                  </button>
                </li>
              </ul>
            </Panel>

            {(urgent || analysis.category === 'court') && <LegalHelpPanel number="01H" />}
          </div>
        </>
      )}
    </div>
  );
}
