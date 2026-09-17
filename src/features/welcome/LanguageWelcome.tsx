import { LANGUAGE_INFO, UI_LANGUAGES, type UiLanguage } from '../../../shared/languages';
import { Icon } from '../../components/Icon';
import { LANGUAGE_GLYPHS } from '../../components/LanguageMenu';
import { Logo } from '../../components/Logo';
import { useFocusOnMount } from '../../hooks/dom';

/** Decorative floating "anatomy" labels that hint at what the app does. */
const FLOATING_CHIPS = [
  { text: 'You must', tone: 'must', lang: 'en' },
  { text: 'Unless…', tone: 'unless', lang: 'en' },
  { text: 'समय-सीमा', tone: 'deadline', lang: 'hi' },
  { text: 'If broken', tone: 'broken', lang: 'en' },
  { text: 'మీరు చేయవచ్చు', tone: 'may', lang: 'te' },
] as const;

const PROMISES: Record<UiLanguage, string> = {
  en: 'Free · Private · A guide, not a lawyer',
  hi: 'मुफ़्त · निजी · वकील नहीं, मार्गदर्शक',
  te: 'ఉచితం · గోప్యం · లాయర్ కాదు, మార్గదర్శి',
};

/**
 * The landing page, shown every time the app opens and reachable from the header.
 * It is intentionally multilingual (not yet translated), so every reader can recognise
 * their own language by its native name and script. The last used language is marked.
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
                aria-current={language === current ? 'true' : undefined}
                onClick={() => onChoose(language)}
              >
                <span className="language-choice__glyph" aria-hidden="true">
                  {LANGUAGE_GLYPHS[language]}
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
                <Icon
                  name={language === current ? 'checkCircle' : 'arrowRight'}
                  className="language-choice__arrow"
                />
              </button>
            </li>
          ))}
        </ul>
        <p className="welcome__promise" lang={current ?? 'en'}>
          <Icon name="shieldCheck" />
          <span>{PROMISES[current ?? 'en']}</span>
        </p>
      </div>
    </div>
  );
}
