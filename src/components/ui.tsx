import type { ReactNode } from 'react';
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
 * A message box. Tone is conveyed by icon, colour AND the title text, never colour alone.
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
      <Icon name={icon ?? TONE_ICONS[tone]} className="notice__icon" />
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
  tone: Tone | 'neutral';
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

/** Reads text aloud in the right language; hidden where the browser cannot speak. */
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
  const { supported, speakingId, speak, stop } = useSpeech();
  if (!supported) return null;
  const speaking = speakingId === id;
  return (
    <button
      type="button"
      className="button button--ghost button--small"
      aria-pressed={speaking}
      onClick={() => (speaking ? stop() : speak(id, text, LANGUAGE_INFO[language].speechTag))}
    >
      <Icon name={speaking ? 'stop' : 'volume'} />
      {speaking ? t('stopListening') : t('listen')}
    </button>
  );
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="visually-hidden"> {t('opensNewTab')}</span>
    </a>
  );
}

/** Free legal aid contacts (India). Shown for urgent papers and on the next-steps page. */
export function LegalHelpCard() {
  const { t } = useI18n();
  return (
    <section className="card help-card" aria-labelledby="legal-help-heading">
      <h2 id="legal-help-heading" className="card__title">
        <Icon name="shield" /> {t('helpHeading')}
      </h2>
      <p>{t('helpBody')}</p>
      <ul className="help-card__actions">
        <li>
          <a className="button button--primary" href="tel:15100">
            <Icon name="phone" /> {t('helpCall')}
          </a>
        </li>
        <li>
          <ExternalLink href="https://nalsa.gov.in/">
            <Icon name="globe" /> {t('helpWebsite')}
          </ExternalLink>
        </li>
        <li>
          <a href="tel:112">
            <Icon name="phone" /> {t('helpEmergency')}
          </a>
        </li>
      </ul>
    </section>
  );
}
