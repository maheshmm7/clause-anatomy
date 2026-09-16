import { useState, type ReactNode } from 'react';
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
        <span className="anatomy__icon">
          <Icon name={icon} />
        </span>
        {label}
      </dt>
      {children}
    </div>
  );
}

export interface PointCardProps {
  point: VerifiedPoint;
  number: number;
  parties: readonly Party[];
  language: ExplanationLanguage;
  perspective: Perspective;
  readingLevel: ReadingLevel;
  titlesById: ReadonlyMap<string, string>;
  checkOutcome: CheckOutcome | undefined;
  onCheck: (outcome: CheckOutcome) => void;
  onOpenPoint: (pointId: string) => void;
  onShowInOriginal: (pointId: string) => void;
}

/** One point of the paper, broken into its anatomy: who, must / must not / may, unless, if broken. */
export function PointCard(props: PointCardProps) {
  const { t } = useI18n();
  const { point, parties, language, perspective } = props;
  const [openTerm, setOpenTerm] = useState<string | null>(null);
  const explanation = props.readingLevel === 'simple' ? point.simple : point.detailed;
  const attention = needsAttention(point, perspective);
  const good = !attention && isGoodForReader(point, perspective);
  const hasAnatomy =
    point.rules.length + point.conditions.length + point.consequences.length > 0 ||
    point.deadline !== '';
  const activeTerm = point.terms.find((term) => term.term === openTerm);
  const tone = attention ? 'attention' : good ? 'good' : point.importance;

  return (
    <article className={`point point--${tone}`} aria-labelledby={`${point.id}-title`}>
      <header className="point__header">
        <span className="point__number" aria-hidden="true">
          {props.number}
        </span>
        <div className="point__heading">
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
          <h2 id={`${point.id}-title`} className="point__title" lang={language}>
            {point.title}
          </h2>
        </div>
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
                tone={rule.type}
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
          <h3 className="section-label">{t('termsHeading')}</h3>
          <p className="terms__hint">{t('termsHint')}</p>
          <ul className="terms__chips">
            {point.terms.map((term) => {
              const open = term.term === openTerm;
              return (
                <li key={term.term}>
                  <button
                    type="button"
                    className={`term-chip term-chip--${term.source}`}
                    aria-expanded={open}
                    aria-controls={`${point.id}-term`}
                    onClick={() => setOpenTerm(open ? null : term.term)}
                    lang={detectScriptLanguage(term.term)}
                  >
                    <Icon name={term.source === 'document' ? 'document' : 'help'} />
                    {term.term}
                  </button>
                </li>
              );
            })}
          </ul>
          <div id={`${point.id}-term`} className="terms__panel" aria-live="polite">
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

      <figure className={`quote${point.verified ? '' : ' quote--unverified'}`}>
        <figcaption className="section-label">{t('quoteHeading')}</figcaption>
        <blockquote lang={detectScriptLanguage(point.quote)}>{point.quote}</blockquote>
        <div className="quote__footer">
          <Badge
            tone={point.verified ? 'success' : 'warning'}
            icon={point.verified ? 'shieldCheck' : 'alert'}
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
    </article>
  );
}
