import { LANGUAGE_INFO, UI_LANGUAGES, type UiLanguage } from '../../../shared/languages';
import { Icon } from '../../components/Icon';
import { useFocusOnMount } from '../../hooks/dom';

/**
 * First screen on a first visit. It is intentionally multilingual (not yet translated),
 * so every reader can recognise their own language by its native name and script.
 */
export function LanguageWelcome({ onChoose }: { onChoose: (language: UiLanguage) => void }) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <div className="welcome">
      <Icon name="scale" className="welcome__logo" />
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
              <span className="language-choice__native">{LANGUAGE_INFO[language].nativeName}</span>
              {language !== 'en' && (
                <span className="language-choice__english" lang="en">
                  {LANGUAGE_INFO[language].englishName}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
