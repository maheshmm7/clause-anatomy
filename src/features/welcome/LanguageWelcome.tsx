import { LANGUAGE_INFO, UI_LANGUAGES, type UiLanguage } from '../../../shared/languages';
import { LANGUAGE_GLYPHS } from '../../components/controls';
import { Icon } from '../../components/Icon';
import { Logo } from '../../components/Logo';
import { useFocusOnMount } from '../../hooks/dom';

const PROMISES: Record<UiLanguage, string> = {
  en: 'Free · Private · A guide, not a lawyer',
  hi: 'मुफ़्त · निजी · वकील नहीं, मार्गदर्शक',
  te: 'ఉచితం · గోప్యం · లాయర్ కాదు, మార్గదర్శి',
};

/** A clause dissected, as the landing page's editorial illustration. */
const SPECIMEN = [
  { tag: 'MUST NOT', text: 'sublet the premises', tone: 'danger' },
  { tag: 'UNLESS', text: 'prior written consent', tone: 'warning' },
  { tag: 'IF BROKEN', text: 'deposit forfeited', tone: 'info' },
] as const;

/**
 * The landing page, shown every time the app opens and reachable from the menu.
 * Intentionally multilingual (not yet translated), so every reader recognises their
 * language by its own script. The last used language is marked.
 */
export function LanguageWelcome({
  current,
  onChoose,
}: {
  current: UiLanguage | null;
  onChoose: (language: UiLanguage) => void;
}) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <div className="welcome">
      <div className="welcome__masthead">
        <div className="welcome__brand">
          <Logo size={56} />
          <p className="welcome__name">
            CLAUSE
            <br />
            ANATOMY
          </p>
        </div>
        <p className="kicker">
          <span className="kicker__number">§</span>
          <span lang="en">Legal intelligence workspace</span>
        </p>
      </div>

      <div className="welcome__grid">
        <section className="welcome__choose" aria-labelledby="welcome-title">
          <h1 id="welcome-title" ref={headingRef} tabIndex={-1} className="welcome__title">
            <span lang="en">Choose your language</span>
            <span lang="hi">अपनी भाषा चुनें</span>
            <span lang="te">మీ భాషను ఎంచుకోండి</span>
          </h1>
          <ul className="welcome__options">
            {UI_LANGUAGES.map((language, index) => (
              <li key={language}>
                <button
                  type="button"
                  className="language-card"
                  lang={language}
                  aria-current={language === current ? 'true' : undefined}
                  onClick={() => onChoose(language)}
                >
                  <span className="language-card__index" aria-hidden="true">
                    0{index + 1}
                  </span>
                  <span className="language-card__glyph" aria-hidden="true">
                    {LANGUAGE_GLYPHS[language]}
                  </span>
                  <span className="language-card__names">
                    <span className="language-card__native">
                      {LANGUAGE_INFO[language].nativeName}
                    </span>
                    {language !== 'en' && (
                      <span className="language-card__english" lang="en">
                        {LANGUAGE_INFO[language].englishName}
                      </span>
                    )}
                  </span>
                  <Icon
                    name={language === current ? 'checkCircle' : 'arrowRight'}
                    className="language-card__arrow"
                  />
                </button>
              </li>
            ))}
          </ul>
          <p className="welcome__promise" lang={current ?? 'en'}>
            <Icon name="shieldCheck" />
            <span>{PROMISES[current ?? 'en']}</span>
          </p>
        </section>

        <figure className="specimen" aria-hidden="true">
          <p className="specimen__label">CLAUSE 6 — SPECIMEN</p>
          <p className="specimen__text">
            “The Lessee{' '}
            <mark className="specimen__mark specimen__mark--danger">shall not sublet</mark> the
            premises without the{' '}
            <mark className="specimen__mark specimen__mark--warning">prior written consent</mark> of
            the Lessor, failing which the{' '}
            <mark className="specimen__mark specimen__mark--info">
              deposit shall stand forfeited
            </mark>
            .”
          </p>
          <ul className="specimen__parts">
            {SPECIMEN.map((part) => (
              <li key={part.tag} className={`specimen__part specimen__part--${part.tone}`}>
                <span className="specimen__tag">{part.tag}</span>
                <span>{part.text}</span>
              </li>
            ))}
          </ul>
        </figure>
      </div>
    </div>
  );
}
