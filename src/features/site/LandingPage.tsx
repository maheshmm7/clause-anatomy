import { EXPLANATION_LANGUAGES, LANGUAGE_INFO } from '../../../shared/languages';
import { Icon, type IconName } from '../../components/Icon';
import { useFocusOnMount } from '../../hooks/dom';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages/en';
import { SiteFooter, SiteHeader } from './SiteChrome';

const PROBLEMS: readonly { title: MessageKey; body: MessageKey; icon: IconName }[] = [
  { title: 'problem1Title', body: 'problem1Body', icon: 'book' },
  { title: 'problem2Title', body: 'problem2Body', icon: 'alert' },
  { title: 'problem3Title', body: 'problem3Body', icon: 'help' },
];

const FEATURES: readonly { title: MessageKey; body: MessageKey; icon: IconName; tone: string }[] = [
  { title: 'feature1Title', body: 'feature1Body', icon: 'layers', tone: 'yellow' },
  { title: 'feature2Title', body: 'feature2Body', icon: 'checkCircle', tone: 'mint' },
  { title: 'feature3Title', body: 'feature3Body', icon: 'radar', tone: 'red' },
  { title: 'feature4Title', body: 'feature4Body', icon: 'branch', tone: 'blue' },
  { title: 'feature5Title', body: 'feature5Body', icon: 'chat', tone: 'lilac' },
  { title: 'feature6Title', body: 'feature6Body', icon: 'flag', tone: 'yellow' },
];

const STEPS: readonly { title: MessageKey; body: MessageKey }[] = [
  { title: 'howStep1', body: 'step1Body' },
  { title: 'howStep2', body: 'step2Body' },
  { title: 'howStep3', body: 'step3Body' },
];

const TRUST: readonly { title: MessageKey; body: MessageKey; icon: IconName }[] = [
  { title: 'trust1Title', body: 'trust1Body', icon: 'lock' },
  { title: 'trustNothingStored', body: 'trust2Body', icon: 'shield' },
  { title: 'trust3Title', body: 'trust3Body', icon: 'shieldCheck' },
  { title: 'trust4Title', body: 'trust4Body', icon: 'scale' },
];

/** The dissected clause: the product idea in one picture. English, like most legal papers. */
function HeroSpecimen() {
  const { t } = useI18n();
  return (
    <figure className="hero-card">
      <figcaption className="hero-card__caption">
        <span className="hero-card__dot" aria-hidden="true" />
        {t('heroCardCaption')}
      </figcaption>
      <div aria-hidden="true">
        <p className="hero-card__text" lang="en">
          “The Lessee{' '}
          <mark className="specimen__mark specimen__mark--danger">shall not sublet</mark> the
          premises without the{' '}
          <mark className="specimen__mark specimen__mark--warning">prior written consent</mark> of
          the Lessor, failing which the{' '}
          <mark className="specimen__mark specimen__mark--info">deposit shall stand forfeited</mark>
          .”
        </p>
        <ul className="hero-card__parts" lang="en">
          <li className="specimen__part specimen__part--danger">
            <span className="specimen__tag">MUST NOT</span>
            <span>sublet the flat</span>
          </li>
          <li className="specimen__part specimen__part--warning">
            <span className="specimen__tag">UNLESS</span>
            <span>landlord agrees in writing</span>
          </li>
          <li className="specimen__part specimen__part--info">
            <span className="specimen__tag">IF BROKEN</span>
            <span>you lose the deposit</span>
          </li>
        </ul>
        <div className="hero-card__stats" lang="en">
          <span>
            <strong>11</strong> clauses
          </span>
          <span className="hero-card__stat--danger">
            <strong>5</strong> need attention
          </span>
          <span className="hero-card__stat--ok">
            <strong>100%</strong> verified
          </span>
        </div>
      </div>
    </figure>
  );
}

/** The public home page: what the product is, why it matters and how to start. */
export function LandingPage({ onTryExample }: { onTryExample: () => void }) {
  const { t } = useI18n();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  const sections = [
    { id: 'features', label: t('navFeatures') },
    { id: 'how-it-works', label: t('navHowItWorks') },
    { id: 'trust', label: t('navTrust') },
  ];

  return (
    <div className="site">
      <SiteHeader sections={sections} />
      <main id="main" className="landing" tabIndex={-1}>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero__inner">
            <div className="hero__copy">
              <p className="kicker">
                <span className="kicker__number">§</span>
                <span>{t('brandTagline')}</span>
              </p>
              <h1 id="hero-title" ref={headingRef} tabIndex={-1} className="hero__title">
                {t('heroTitle')}
              </h1>
              <p className="hero__lead">{t('heroLead')}</p>
              <div className="hero__actions">
                <a className="btn btn--primary btn--large" href="#/workspace">
                  {t('openWorkspace')} <Icon name="arrowRight" />
                </a>
                <button type="button" className="btn btn--large" onClick={onTryExample}>
                  <Icon name="sparkle" /> {t('heroTryExample')}
                </button>
              </div>
              <ul className="hero__trust">
                {(
                  [
                    ['trustFree', 'check'],
                    ['trustNoSignup', 'user'],
                    ['trustNothingStored', 'lock'],
                    ['trustLanguages', 'globe'],
                  ] as const
                ).map(([key, icon]) => (
                  <li key={key}>
                    <Icon name={icon} /> {t(key)}
                  </li>
                ))}
              </ul>
            </div>
            <HeroSpecimen />
          </div>
        </section>

        <section className="language-band" aria-label={t('languagesBandLabel')}>
          <p className="language-band__label">{t('languagesBandLabel')}</p>
          <ul className="language-band__list">
            {EXPLANATION_LANGUAGES.map((language) => (
              <li key={language} lang={language}>
                {LANGUAGE_INFO[language].nativeName}
              </li>
            ))}
          </ul>
        </section>

        <section className="landing-section" aria-labelledby="problem-title">
          <div className="landing-section__inner">
            <header className="landing-section__head">
              <p className="kicker">
                <span className="kicker__number">01</span>
                <span>{t('problemKicker')}</span>
              </p>
              <h2 id="problem-title" className="landing-section__title" tabIndex={-1}>
                {t('problemTitle')}
              </h2>
            </header>
            <ul className="problem-grid">
              {PROBLEMS.map((item) => (
                <li key={item.title} className="problem-card">
                  <Icon name={item.icon} className="problem-card__icon" />
                  <h3 className="problem-card__title">{t(item.title)}</h3>
                  <p>{t(item.body)}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="features" className="landing-section" aria-labelledby="features-title">
          <div className="landing-section__inner">
            <header className="landing-section__head">
              <p className="kicker">
                <span className="kicker__number">02</span>
                <span>{t('featuresKicker')}</span>
              </p>
              <h2 id="features-title" className="landing-section__title" tabIndex={-1}>
                {t('featuresTitle')}
              </h2>
            </header>
            <ul className="feature-grid">
              {FEATURES.map((feature, index) => (
                <li key={feature.title} className={`feature-card feature-card--${feature.tone}`}>
                  <div className="feature-card__top">
                    <span className="feature-card__number" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <Icon name={feature.icon} className="feature-card__icon" />
                  </div>
                  <h3 className="feature-card__title">{t(feature.title)}</h3>
                  <p>{t(feature.body)}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="how-it-works"
          className="landing-section landing-section--ink"
          aria-labelledby="how-title"
        >
          <div className="landing-section__inner">
            <header className="landing-section__head">
              <p className="kicker kicker--inverse">
                <span className="kicker__number">03</span>
                <span>{t('navHowItWorks')}</span>
              </p>
              <h2 id="how-title" className="landing-section__title" tabIndex={-1}>
                {t('stepsTitle')}
              </h2>
            </header>
            <ol className="step-grid">
              {STEPS.map((step, index) => (
                <li key={step.title} className="step-card">
                  <span className="step-card__number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <h3 className="step-card__title">{t(step.title)}</h3>
                  <p>{t(step.body)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="trust" className="landing-section" aria-labelledby="trust-title">
          <div className="landing-section__inner">
            <header className="landing-section__head">
              <p className="kicker">
                <span className="kicker__number">04</span>
                <span>{t('navTrust')}</span>
              </p>
              <h2 id="trust-title" className="landing-section__title" tabIndex={-1}>
                {t('trustTitle')}
              </h2>
            </header>
            <ul className="trust-grid">
              {TRUST.map((item) => (
                <li key={item.title} className="trust-card">
                  <Icon name={item.icon} className="trust-card__icon" />
                  <div>
                    <h3 className="trust-card__title">{t(item.title)}</h3>
                    <p>{t(item.body)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="cta-band" aria-labelledby="cta-title">
          <div className="cta-band__inner">
            <div>
              <h2 id="cta-title" className="cta-band__title">
                {t('ctaTitle')}
              </h2>
              <p>{t('ctaBody')}</p>
            </div>
            <a className="btn btn--large btn--ink" href="#/workspace">
              {t('openWorkspace')} <Icon name="arrowRight" />
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
