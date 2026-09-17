import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { LANGUAGE_INFO, UI_LANGUAGES, type UiLanguage } from '../../shared/languages';
import { useI18n } from '../i18n/I18nProvider';
import { useSettings } from '../settings/SettingsProvider';
import { Icon } from './Icon';

export const LANGUAGE_GLYPHS: Record<UiLanguage, string> = { en: 'A', hi: 'अ', te: 'అ' };

/**
 * Header language switcher. A custom disclosure instead of a native <select>, so it is
 * readable in both themes on every platform. Keyboard: Enter/Space to open, arrow keys to
 * move, Escape to close; focus returns to the button.
 */
export function LanguageMenu({ onOpenLanguagePage }: { onOpenLanguagePage: () => void }) {
  const { t, language } = useI18n();
  const { setUiLanguage } = useSettings();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const close = (returnFocus: boolean): void => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    listRef.current?.querySelector<HTMLButtonElement>('[aria-current="true"]')?.focus();
    // Close when the pointer or keyboard focus goes anywhere outside the menu.
    const onOutside = (event: Event): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('focusin', onOutside);
    return () => {
      document.removeEventListener('pointerdown', onOutside);
      document.removeEventListener('focusin', onOutside);
    };
  }, [open]);

  const onItemKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    const items = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const moves: Record<string, number> = {
      ArrowDown: index + 1,
      ArrowUp: index - 1,
      Home: 0,
      End: items.length - 1,
    };
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
      return;
    }
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    items[(target + items.length) % items.length]?.focus();
  };

  return (
    <div className="lang-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="lang-menu__button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon name="globe" className="lang-menu__globe" />
        <span className="visually-hidden">{t('uiLanguageLabel')}: </span>
        <span lang={language}>{LANGUAGE_INFO[language].nativeName}</span>
        <Icon name="chevronDown" className="lang-menu__chevron" />
      </button>
      {open && (
        <ul id={listId} ref={listRef} className="lang-menu__list" aria-label={t('uiLanguageLabel')}>
          {UI_LANGUAGES.map((option) => (
            <li key={option}>
              <button
                type="button"
                className="lang-menu__item"
                onKeyDown={onItemKeyDown}
                lang={option}
                aria-current={option === language ? 'true' : undefined}
                onClick={() => {
                  setUiLanguage(option);
                  close(true);
                }}
              >
                <span className="lang-menu__glyph" aria-hidden="true">
                  {LANGUAGE_GLYPHS[option]}
                </span>
                <span className="lang-menu__names">
                  <span>{LANGUAGE_INFO[option].nativeName}</span>
                  {option !== 'en' && (
                    <span className="lang-menu__english" lang="en">
                      {LANGUAGE_INFO[option].englishName}
                    </span>
                  )}
                </span>
                {option === language && <Icon name="check" className="lang-menu__check" />}
              </button>
            </li>
          ))}
          <li className="lang-menu__separator">
            <button
              type="button"
              className="lang-menu__item lang-menu__item--page"
              onKeyDown={onItemKeyDown}
              onClick={() => {
                close(false);
                onOpenLanguagePage();
              }}
            >
              <Icon name="home" />
              <span>{t('languagePage')}</span>
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
