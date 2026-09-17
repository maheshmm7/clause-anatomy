import { Icon } from '../../components/Icon';
import { useFocusOnMount } from '../../hooks/dom';
import { useI18n } from '../../i18n/I18nProvider';
import { LEGAL_CONTENT, LEGAL_UPDATED } from '../../i18n/legal';
import {
  LEGAL_PAGES,
  LEGAL_TITLE_KEYS,
  type LegalPage as LegalPageId,
} from '../../i18n/legalPages';
import { SiteFooter, SiteHeader } from './SiteChrome';

/** Privacy policy, terms of use, disclaimer and accessibility statement. */
export function LegalPage({ doc }: { doc: LegalPageId }) {
  const { t, language, formatDate } = useI18n();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const content = LEGAL_CONTENT[language][doc];
  const sectionId = (index: number): string => `${doc}-section-${index + 1}`;

  const scrollTo = (index: number): void => {
    const target = document.getElementById(sectionId(index));
    target?.scrollIntoView({ block: 'start' });
    target?.focus({ preventScroll: true });
  };

  return (
    <div className="site">
      <SiteHeader />
      <main id="main" className="legal" tabIndex={-1}>
        <div className="legal__inner">
          <a className="legal__back" href="#/">
            <Icon name="arrowLeft" /> {t('legalBack')}
          </a>
          <header className="legal__head">
            <p className="kicker">
              <span className="kicker__number">§</span>
              <span>{t('footerLegal')}</span>
            </p>
            <h1 ref={headingRef} tabIndex={-1} className="legal__title">
              {t(LEGAL_TITLE_KEYS[doc])}
            </h1>
            <p className="legal__updated">
              {t('legalUpdated', { date: formatDate(LEGAL_UPDATED) })}
            </p>
            <p className="legal__intro">{content.intro}</p>
          </header>

          <div className="legal__layout">
            <nav className="legal__toc" aria-label={t('legalContents')}>
              <p className="sub-label">{t('legalContents')}</p>
              <ol>
                {content.sections.map((section, index) => (
                  <li key={section.heading}>
                    <button type="button" onClick={() => scrollTo(index)}>
                      {section.heading}
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
            <div className="legal__body">
              {content.sections.map((section, index) => (
                <section key={section.heading} className="legal__section">
                  <h2 id={sectionId(index)} tabIndex={-1}>
                    <span className="legal__number" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {section.heading}
                  </h2>
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </section>
              ))}
            </div>
          </div>

          <nav className="legal__others" aria-label={t('footerLegal')}>
            <ul>
              {LEGAL_PAGES.filter((page) => page !== doc).map((page) => (
                <li key={page}>
                  <a className="btn" href={`#/${page}`}>
                    {t(LEGAL_TITLE_KEYS[page])} <Icon name="arrowRight" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
