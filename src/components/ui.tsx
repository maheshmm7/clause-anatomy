import { useId, type ReactNode, type Ref } from 'react';
import { LANGUAGE_INFO, type ExplanationLanguage } from '../../shared/languages';
import { useSpeech } from '../hooks/speech';
import { useI18n } from '../i18n/I18nProvider';
import { Icon, type IconName } from './Icon';

export type Tone = 'info' | 'success' | 'warning' | 'danger';

const TONE_ICONS: Record<Tone, IconName> = {
  info: 'help',
  success: 'checkCircle',
  warning: 'alert',
  danger: 'alert',
};

/**
 * A message block. Tone is conveyed by icon, colour AND the title text, never colour alone.
 * `urgent` messages use role="alert" so screen readers announce them immediately.
 */
export function Notice({
  tone,
  title,
  children,
  urgent = false,
  icon,
}: {
  tone: Tone;
  title?: string;
  children?: ReactNode;
  urgent?: boolean;
  icon?: IconName;
}) {
  return (
    <div className={`notice notice--${tone}`} role={urgent ? 'alert' : 'status'}>
      <span className="notice__icon">
        <Icon name={icon ?? TONE_ICONS[tone]} />
      </span>
      <div className="notice__body">
        {title && <p className="notice__title">{title}</p>}
        {children}
      </div>
    </div>
  );
}

export function Badge({
  tone,
  icon,
  children,
}: {
  tone: Tone | 'neutral' | 'ink';
  icon?: IconName;
  children: ReactNode;
}) {
  return (
    <span className={`badge badge--${tone}`}>
      {icon && <Icon name={icon} />}
      {children}
    </span>
  );
}

/**
 * A dashboard panel: numbered editorial header, hard border, offset shadow.
 * The heading level is configurable so every view keeps a correct outline.
 */
export function Panel({
  title,
  number,
  icon,
  actions,
  children,
  className,
  headingLevel = 'h2',
}: {
  title: string;
  number?: string;
  icon?: IconName;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  headingLevel?: 'h2' | 'h3';
}) {
  const headingId = useId();
  const Heading = headingLevel;
  return (
    <section className={className ? `panel ${className}` : 'panel'} aria-labelledby={headingId}>
      <header className="panel__head">
        {number && (
          <span className="panel__number" aria-hidden="true">
            {number}
          </span>
        )}
        <Heading id={headingId} className="panel__title">
          {icon && <Icon name={icon} />}
          <span>{title}</span>
        </Heading>
        {actions && <div className="panel__actions">{actions}</div>}
      </header>
      <div className="panel__body">{children}</div>
    </section>
  );
}

/** The title block of every workspace view (owns the view's single h1). */
export function ViewHeader({
  number,
  kicker,
  title,
  titleLang,
  actions,
  children,
  headingRef,
}: {
  number: string;
  kicker: string;
  title: string;
  titleLang?: string;
  actions?: ReactNode;
  children?: ReactNode;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  return (
    <header className="view-header">
      <p className="kicker">
        <span className="kicker__number">{number}</span>
        <span>{kicker}</span>
      </p>
      <div className="view-header__row">
        <h1 ref={headingRef} tabIndex={-1} className="view-header__title" lang={titleLang}>
          {title}
        </h1>
        {actions && <div className="view-header__actions">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

/** Reads text aloud in the right language; hidden where the device has no such voice. */
export function SpeakButton({
  id,
  text,
  language,
}: {
  id: string;
  text: string;
  language: ExplanationLanguage;
}) {
  const { t } = useI18n();
  const { canSpeak, speakingId, speak, stop } = useSpeech();
  const tag = LANGUAGE_INFO[language].speechTag;
  if (!canSpeak(tag)) return null;
  const speaking = speakingId === id;
  return (
    <button
      type="button"
      className="btn btn--small"
      aria-pressed={speaking}
      onClick={() => (speaking ? stop() : speak(id, text, tag))}
    >
      <Icon name={speaking ? 'stop' : 'volume'} />
      {speaking ? t('stopListening') : t('listen')}
    </button>
  );
}

/**
 * A wide table that may scroll sideways on small screens. It is focusable and named,
 * so keyboard users can scroll it too.
 */
export function ScrollArea({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="table-wrap" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

/** Offers the reader's own Gemini key when live AI is busy, used up or refused. */
export function OwnKeyButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n();
  return (
    <button type="button" className="btn btn--small notice__action" onClick={onClick}>
      <Icon name="key" /> {t('useOwnKey')}
    </button>
  );
}

export function ExternalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="visually-hidden"> {t('opensNewTab')}</span>
    </a>
  );
}

/** Free legal aid contacts (India). */
export function LegalHelpPanel({ number }: { number?: string }) {
  const { t } = useI18n();
  return (
    <Panel title={t('helpHeading')} number={number} icon="shield" className="panel--help">
      <p>{t('helpBody')}</p>
      <ul className="action-list">
        <li>
          <a className="btn btn--primary" href="tel:15100">
            <Icon name="phone" /> {t('helpCall')}
          </a>
        </li>
        <li>
          <ExternalLink href="https://nalsa.gov.in/" className="btn">
            <Icon name="globe" /> {t('helpWebsite')}
          </ExternalLink>
        </li>
        <li>
          <a className="btn" href="tel:112">
            <Icon name="phone" /> {t('helpEmergency')}
          </a>
        </li>
      </ul>
    </Panel>
  );
}
