import { LanguageSelect } from '../../components/controls';
import { Icon } from '../../components/Icon';
import { Logo } from '../../components/Logo';
import { ExternalLink } from '../../components/ui';
import { useMediaQuery } from '../../hooks/dom';
import { useI18n } from '../../i18n/I18nProvider';
import { LEGAL_PAGES, LEGAL_TITLE_KEYS } from '../../i18n/legalPages';
import { useSettings } from '../../settings/SettingsProvider';

/** Light/dark switch for pages without the settings dialog. */
export function ThemeToggle() {
  const { t } = useI18n();
  const { theme, setTheme } = useSettings();
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const dark = theme === 'dark' || (theme === 'system' && systemDark);
  return (
    <button
      type="button"
      className="icon-btn"
      aria-pressed={dark}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      <Icon name={dark ? 'sun' : 'moon'} />
      <span className="visually-hidden">{t('actionToggleTheme')}</span>
    </button>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark" aria-hidden="true">
      <span>Clause</span>
      <span>Anatomy</span>
    </span>
  );
}

export interface PageSection {
  id: string;
  label: string;
}

/** Header for the public pages: brand, in-page sections, language, theme, open app. */
export function SiteHeader({ sections = [] }: { sections?: readonly PageSection[] }) {
  const { t } = useI18n();

  const scrollTo = (id: string): void => {
    const target = document.getElementById(id);
    if (!target) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    target.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  };

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a className="site-header__brand" href="#/">
          <Logo size={40} />
          <Wordmark />
          <span className="visually-hidden">{t('appName')}</span>
        </a>
        {sections.length > 0 && (
          <nav className="site-nav" aria-label={t('siteNavLabel')}>
            <ul>
              {sections.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    className="site-nav__link"
                    onClick={() => scrollTo(section.id)}
                  >
                    {section.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <div className="site-header__actions">
          <LanguageSelect />
          <ThemeToggle />
          <a className="btn btn--primary site-header__cta" href="#/workspace">
            <span className="btn__label">{t('openApp')}</span>
            <Icon name="arrowRight" />
          </a>
        </div>
      </div>
    </header>
  );
}

function LegalLinks() {
  const { t } = useI18n();
  return (
    <>
      {LEGAL_PAGES.map((page) => (
        <li key={page}>
          <a href={`#/${page}`}>{t(LEGAL_TITLE_KEYS[page])}</a>
        </li>
      ))}
    </>
  );
}

function Copyright() {
  const { t } = useI18n();
  return <p>{t('footerCopyright', { year: new Date().getFullYear() })}</p>;
}

/**
 * Site footer: disclaimer, product and legal links, help lines and copyright.
 * `compact` is the one-line version used inside the workspace.
 */
export function SiteFooter({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();

  if (compact) {
    return (
      <footer className="site-footer site-footer--compact">
        <p className="site-footer__disclaimer">
          <Icon name="shield" /> {t('disclaimerShort')}
        </p>
        <nav aria-label={t('footerNavLabel')}>
          <ul className="site-footer__inline">
            <LegalLinks />
            <li>
              <a href="tel:15100">{t('footerLegalAid')}</a>
            </li>
          </ul>
        </nav>
        <div className="site-footer__bottom">
          <Copyright />
        </div>
      </footer>
    );
  }

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <a className="site-header__brand" href="#/">
            <Logo size={44} />
            <Wordmark />
            <span className="visually-hidden">{t('appName')}</span>
          </a>
          <p className="site-footer__tagline">{t('brandTagline')}</p>
          <p className="site-footer__disclaimer">
            <Icon name="shield" /> {t('disclaimerShort')}
          </p>
        </div>
        <nav className="site-footer__nav" aria-label={t('footerNavLabel')}>
          <div className="site-footer__group">
            <h2 className="site-footer__heading">{t('footerProduct')}</h2>
            <ul>
              <li>
                <a href="#/">{t('footerHome')}</a>
              </li>
              <li>
                <a href="#/workspace">{t('openWorkspace')}</a>
              </li>
            </ul>
          </div>
          <div className="site-footer__group">
            <h2 className="site-footer__heading">{t('footerLegal')}</h2>
            <ul>
              <LegalLinks />
            </ul>
          </div>
          <div className="site-footer__group">
            <h2 className="site-footer__heading">{t('footerHelp')}</h2>
            <ul>
              <li>
                <a href="tel:15100">{t('footerLegalAid')}</a>
              </li>
              <li>
                <a href="tel:112">{t('footerEmergency')}</a>
              </li>
              <li>
                <ExternalLink href="https://nalsa.gov.in/">nalsa.gov.in</ExternalLink>
              </li>
            </ul>
          </div>
        </nav>
      </div>
      <div className="site-footer__bottom">
        <Copyright />
        <p>{t('footerBuiltWith')}</p>
      </div>
    </footer>
  );
}
