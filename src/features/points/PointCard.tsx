import type { ReactNode } from 'react';
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

const RULE_STYLE: Record<
  VerifiedPoint['rules'][number]['type'],
  { icon: IconName; you: MessageKey; party: MessageKey; tone: string }
> = {
  must: { icon: 'checkCircle', you: 'anatomyYouMust', party: 'anatomyPartyMust', tone: 'must' },
  mustNot: {
    icon: 'ban',
    you: 'anatomyYouMustNot',
    party: 'anatomyPartyMustNot',
    tone: 'must-not',
  },
  may: { icon: 'key', you: 'anatomyYouMay', party: 'anatomyPartyMay', tone: 'may' },
};

function AnatomyRow({
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
    <div className={`anatomy__row anatomy__row--${tone}`}>
      <dt>
        <Icon name={icon} /> {label}
      </dt>
      {children}
    </div>
  );
}

export interface PointCardProps {
  point: VerifiedPoint;
  parties: readonly Party[];
  language: ExplanationLanguage;
  perspective: Perspective;
  readingLevel: ReadingLevel;
  titlesById: ReadonlyMap<string, string>;
  checkOutcome: CheckOutcome | undefined;
  onCheck: (outcome: CheckOutcome) => void;
  onOpenPoint: (pointId: string) => void;
  onShowInOriginal: (pointId: string) => void;
  headingLevel?: 'h2' | 'h3';
}

/** One point of the paper, broken into its anatomy: who, must / must not / may, unless, if broken. */
export function PointCard(props: PointCardProps) {
  const { t } = useI18n();
  const { point, parties, language, perspective } = props;
  const Heading = props.headingLevel ?? 'h2';
  const explanation = props.readingLevel === 'simple' ? point.simple : point.detailed;
  const attention = needsAttention(point, perspective);
  const good = !attention && isGoodForReader(point, perspective);
  const quoteLanguage = detectScriptLanguage(point.quote);
  const hasAnatomy =
    point.rules.length + point.conditions.length + point.consequences.length > 0 ||
    point.deadline !== '';

  return (
    <article
      className={`point card${attention ? ' point--attention' : ''}`}
      aria-labelledby={`${point.id}-title`}
    >
      <header className="point__header">
        <div className="point__badges">
          {point.sourceLabel && <Badge tone="neutral">{point.sourceLabel}</Badge>}
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
        </div>
        <Heading id={`${point.id}-title`} className="point__title" lang={language}>
          {point.title}
        </Heading>
      </header>

      <div className="point__explanation">
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
              <AnatomyRow
                key={`${rule.partyId}-${index}`}
                icon={style.icon}
                tone={style.tone}
                label={label}
              >
                <dd>{rule.action}</dd>
              </AnatomyRow>
            );
          })}
          {point.conditions.length > 0 && (
            <AnatomyRow icon="branch" tone="condition" label={t('anatomyUnless')}>
              {point.conditions.map((condition) => (
                <dd key={condition}>{condition}</dd>
              ))}
            </AnatomyRow>
          )}
          {point.consequences.length > 0 && (
            <AnatomyRow icon="alert" tone="consequence" label={t('anatomyIfBroken')}>
              {point.consequences.map((consequence) => (
                <dd key={consequence}>{consequence}</dd>
              ))}
            </AnatomyRow>
          )}
          {point.deadline && (
            <AnatomyRow icon="clock" tone="deadline" label={t('anatomyDeadline')}>
              <dd>{point.deadline}</dd>
            </AnatomyRow>
          )}
        </dl>
      )}

      {point.terms.length > 0 && (
        <div className="terms">
          <h3 id={`${point.id}-terms`} className="section-label">
            {t('termsHeading')}
          </h3>
          <dl className="terms__list">
            {point.terms.map((term) => (
              <div key={term.term} className="terms__item">
                <dt lang={detectScriptLanguage(term.term)}>{term.term}</dt>
                <dd>
                  <span lang={language}>{term.meaning}</span>{' '}
                  <Badge
                    tone={term.source === 'document' ? 'success' : 'warning'}
                    icon={term.source === 'document' ? 'document' : 'help'}
                  >
                    {t(term.source === 'document' ? 'termFromDocument' : 'termGeneral')}
                  </Badge>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <figure className={`quote${point.verified ? '' : ' quote--unverified'}`}>
        <figcaption className="section-label">{t('quoteHeading')}</figcaption>
        <blockquote lang={quoteLanguage}>{point.quote}</blockquote>
        <div className="quote__footer">
          <Badge
            tone={point.verified ? 'success' : 'warning'}
            icon={point.verified ? 'check' : 'alert'}
          >
            {t(point.verified ? 'quoteVerified' : 'quoteUnverified')}
          </Badge>
          {point.verified && (
            <button
              type="button"
              className="button button--link"
              onClick={() => props.onShowInOriginal(point.id)}
            >
              <Icon name="document" /> {t('showInOriginal')}
            </button>
          )}
        </div>
      </figure>

      {point.relatedPointIds.length > 0 && (
        <div className="related">
          <h3 className="section-label">{t('relatedHeading')}</h3>
          <ul>
            {point.relatedPointIds.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  className="button button--link"
                  onClick={() => props.onOpenPoint(id)}
                  lang={language}
                >
                  <Icon name="arrowRight" /> {props.titlesById.get(id) ?? id}
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
    </article>
  );
}
