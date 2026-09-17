import { useId, useState, type ReactNode } from 'react';
import type { ExplanationLanguage } from '../../../shared/languages';
import type { Party, VerifiedPoint } from '../../../shared/schema';
import { Icon, type IconName } from '../../components/Icon';
import { Badge, SpeakButton } from '../../components/ui';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages/en';
import { detectScriptLanguage } from '../../lib/browser';
import type { CheckOutcome } from '../../lib/brief';
import {
  isGoodForReader,
  needsAttention,
  partyLabel,
  type Perspective,
} from '../../lib/perspective';
import type { ReadingLevel } from '../../settings/SettingsProvider';
import { TeachBack } from './TeachBack';

const IMPORTANCE_KEYS: Record<VerifiedPoint['importance'], MessageKey> = {
  high: 'importanceHigh',
  medium: 'importanceMedium',
  low: 'importanceLow',
};

type RuleType = VerifiedPoint['rules'][number]['type'];

const RULE_STYLE: Record<RuleType, { icon: IconName; you: MessageKey; party: MessageKey }> = {
  must: { icon: 'checkCircle', you: 'anatomyYouMust', party: 'anatomyPartyMust' },
  mustNot: { icon: 'ban', you: 'anatomyYouMustNot', party: 'anatomyPartyMustNot' },
  may: { icon: 'key', you: 'anatomyYouMay', party: 'anatomyPartyMay' },
};

function Cell({
  icon,
  tone,
  label,
  children,
}: {
  icon: IconName;
  tone: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={`anatomy__cell anatomy__cell--${tone}`}>
      <dt>
        <Icon name={icon} />
        {label}
      </dt>
      {children}
    </div>
  );
}

export interface ClauseDetailProps {
  point: VerifiedPoint;
  number: number;
  parties: readonly Party[];
  language: ExplanationLanguage;
  perspective: Perspective;
  readingLevel: ReadingLevel;
  titlesById: ReadonlyMap<string, string>;
  checkOutcome: CheckOutcome | undefined;
  note: string;
  flagged: boolean;
  onCheck: (outcome: CheckOutcome) => void;
  onNote: (note: string) => void;
  onToggleFlag: () => void;
  onOpenPoint: (pointId: string) => void;
  onShowInDocument: (pointId: string) => void;
  onAsk: () => void;
}

/** One clause dissected: who must / must not / may, unless, if broken, time limit. */
export function ClauseDetail(props: ClauseDetailProps) {
  const { t } = useI18n();
  const { point, parties, language, perspective } = props;
  const [openTerm, setOpenTerm] = useState<string | null>(null);
  const noteId = useId();
  const explanation = props.readingLevel === 'simple' ? point.simple : point.detailed;
  const attention = needsAttention(point, perspective);
  const good = !attention && isGoodForReader(point, perspective);
  const activeTerm = point.terms.find((term) => term.term === openTerm);
  const hasAnatomy =
    point.rules.length + point.conditions.length + point.consequences.length > 0 ||
    point.deadline !== '';

  return (
    <article
      className={`clause${attention ? ' clause--attention' : ''}${good ? ' clause--good' : ''}`}
      aria-labelledby={`${point.id}-title`}
    >
      <header className="clause__head">
        <span className="clause__number" aria-hidden="true">
          {String(props.number).padStart(2, '0')}
        </span>
        <div className="clause__heading">
          <div className="clause__badges">
            {point.sourceLabel && <Badge tone="ink">{point.sourceLabel}</Badge>}
            <Badge tone={point.importance === 'high' ? 'warning' : 'neutral'}>
              {t(IMPORTANCE_KEYS[point.importance])}
            </Badge>
            {attention && (
              <Badge tone="danger" icon="alert">
                {t('attention')}
              </Badge>
            )}
            {good && (
              <Badge tone="success" icon="checkCircle">
                {t('goodForYou')}
              </Badge>
            )}
            {props.flagged && (
              <Badge tone="info" icon="flag">
                {t('flaggedForLawyer')}
              </Badge>
            )}
          </div>
          <h2 id={`${point.id}-title`} className="clause__title" lang={language}>
            {point.title}
          </h2>
        </div>
      </header>

      <div className="clause__explain">
        <p lang={language}>{explanation}</p>
        <SpeakButton
          id={`point-${point.id}`}
          text={`${point.title}. ${explanation}`}
          language={language}
        />
      </div>

      {hasAnatomy && (
        <dl className="anatomy" lang={language}>
          {point.rules.map((rule, index) => {
            const style = RULE_STYLE[rule.type];
            const label =
              perspective !== null && rule.partyId === perspective
                ? t(style.you)
                : t(style.party, { party: partyLabel(parties, rule.partyId) });
            return (
              <Cell
                key={`${rule.partyId}-${index}`}
                icon={style.icon}
                tone={rule.type}
                label={label}
              >
                <dd>{rule.action}</dd>
              </Cell>
            );
          })}
          {point.conditions.length > 0 && (
            <Cell icon="branch" tone="condition" label={t('anatomyUnless')}>
              {point.conditions.map((condition) => (
                <dd key={condition}>{condition}</dd>
              ))}
            </Cell>
          )}
          {point.consequences.length > 0 && (
            <Cell icon="alert" tone="consequence" label={t('anatomyIfBroken')}>
              {point.consequences.map((consequence) => (
                <dd key={consequence}>{consequence}</dd>
              ))}
            </Cell>
          )}
          {point.deadline && (
            <Cell icon="clock" tone="deadline" label={t('anatomyDeadline')}>
              <dd>{point.deadline}</dd>
            </Cell>
          )}
        </dl>
      )}

      <figure className={`source${point.verified ? '' : ' source--unverified'}`}>
        <figcaption className="source__label">{t('quoteHeading')}</figcaption>
        <blockquote lang={detectScriptLanguage(point.quote)}>{point.quote}</blockquote>
        <div className="source__footer">
          <span className={`stamp${point.verified ? '' : ' stamp--warn'}`}>
            <Icon name={point.verified ? 'shieldCheck' : 'alert'} />
            {t(point.verified ? 'quoteVerified' : 'quoteUnverified')}
          </span>
          {point.verified && (
            <button
              type="button"
              className="btn btn--small"
              onClick={() => props.onShowInDocument(point.id)}
            >
              <Icon name="document" /> {t('showInDocument')}
            </button>
          )}
        </div>
      </figure>

      {point.terms.length > 0 && (
        <div className="terms">
          <h3 className="sub-label">{t('termsHeading')}</h3>
          <p className="hint">{t('termsHint')}</p>
          <ul className="terms__chips">
            {point.terms.map((term) => {
              const open = term.term === openTerm;
              return (
                <li key={term.term}>
                  <button
                    type="button"
                    className={`term term--${term.source}`}
                    aria-expanded={open}
                    aria-controls={`${point.id}-term`}
                    onClick={() => setOpenTerm(open ? null : term.term)}
                    lang={detectScriptLanguage(term.term)}
                  >
                    {term.term}
                  </button>
                </li>
              );
            })}
          </ul>
          <div id={`${point.id}-term`} aria-live="polite">
            {activeTerm && (
              <div className={`definition definition--${activeTerm.source}`}>
                <p className="definition__term" lang={detectScriptLanguage(activeTerm.term)}>
                  {activeTerm.term}
                </p>
                <p lang={language}>{activeTerm.meaning}</p>
                <Badge
                  tone={activeTerm.source === 'document' ? 'success' : 'warning'}
                  icon={activeTerm.source === 'document' ? 'document' : 'help'}
                >
                  {t(activeTerm.source === 'document' ? 'termFromDocument' : 'termGeneral')}
                </Badge>
              </div>
            )}
          </div>
        </div>
      )}

      {point.relatedPointIds.length > 0 && (
        <div className="related">
          <h3 className="sub-label">{t('relatedHeading')}</h3>
          <ul className="related__list">
            {point.relatedPointIds.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  className="related__link"
                  onClick={() => props.onOpenPoint(id)}
                  lang={language}
                >
                  {props.titlesById.get(id) ?? id} <Icon name="arrowRight" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {point.check && (
        <TeachBack
          pointId={point.id}
          check={point.check}
          simple={point.simple}
          language={language}
          outcome={props.checkOutcome}
          onAnswer={props.onCheck}
        />
      )}

      <div className="workbench">
        <div className="workbench__note">
          <label htmlFor={noteId} className="sub-label">
            <Icon name="pencil" /> {t('notesLabel')}
          </label>
          <textarea
            id={noteId}
            rows={3}
            value={props.note}
            maxLength={1000}
            placeholder={t('notesPlaceholder')}
            onChange={(event) => props.onNote(event.target.value)}
          />
          <p className="hint">{t('notesHint')}</p>
        </div>
        <div className="workbench__actions">
          <button
            type="button"
            className={`btn${props.flagged ? ' btn--flagged' : ''}`}
            aria-pressed={props.flagged}
            onClick={props.onToggleFlag}
          >
            <Icon name="flag" /> {t('flagForLawyer')}
          </button>
          <button type="button" className="btn" onClick={props.onAsk}>
            <Icon name="chat" /> {t('askAboutClause')}
          </button>
        </div>
      </div>
    </article>
  );
}
