import { LANGUAGE_INFO, UI_LANGUAGES, type UiLanguage } from '../../../shared/languages';
import { Icon } from '../../components/Icon';
import { Logo } from '../../components/Logo';
import { useFocusOnMount } from '../../hooks/dom';

const GLYPHS: Record<UiLanguage, string> = { en: 'A', hi: 'अ', te: 'అ' };

/** Decorative floating "anatomy" labels that hint at what the app does. */
const FLOATING_CHIPS = [
  { text: 'You must', tone: 'must', lang: 'en' },
  { text: 'Unless…', tone: 'unless', lang: 'en' },
  { text: 'समय-सीमा', tone: 'deadline', lang: 'hi' },
  { text: 'If broken', tone: 'broken', lang: 'en' },
  { text: 'మీరు చేయవచ్చు', tone: 'may', lang: 'te' },
] as const;

/**
 * First screen on a first visit. It is intentionally multilingual (not yet translated),
 * so every reader can recognise their own language by its native name and script.
 */
export function LanguageWelcome({ onChoose }: { onChoose: (language: UiLanguage) => void }) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <div className="welcome screen">
      <div className="welcome__chips" aria-hidden="true">
        {FLOATING_CHIPS.map((chip, index) => (
          <span
            key={chip.text}
            lang={chip.lang}
            className={`float-chip float-chip--${chip.tone} float-chip--${index + 1}`}
          >
            {chip.text}
          </span>
        ))}
      </div>

      <div className="welcome__card">
        <Logo size={84} className="welcome__logo" />
        <p className="welcome__brand">Clause Anatomy</p>
        <h1 ref={headingRef} tabIndex={-1} className="welcome__title">
          <span lang="en">Choose your language</span>
          <span lang="hi">अपनी भाषा चुनें</span>
          <span lang="te">మీ భాషను ఎంచుకోండి</span>
        </h1>
        <ul className="welcome__options">
          {UI_LANGUAGES.map((language) => (
            <li key={language}>
              <button
                type="button"
                className="language-choice"
                lang={language}
                onClick={() => onChoose(language)}
              >
                <span className="language-choice__glyph" aria-hidden="true">
                  {GLYPHS[language]}
                </span>
                <span className="language-choice__text">
                  <span className="language-choice__native">
                    {LANGUAGE_INFO[language].nativeName}
                  </span>
                  {language !== 'en' && (
                    <span className="language-choice__english" lang="en">
                      {LANGUAGE_INFO[language].englishName}
                    </span>
                  )}
                </span>
                <Icon name="arrowRight" className="language-choice__arrow" />
              </button>
            </li>
          ))}
        </ul>
        <p className="welcome__promise">
          <Icon name="shieldCheck" />
          <span lang="en">Free · Private · Not a lawyer, a guide</span>
        </p>
      </div>
    </div>
  );
}
