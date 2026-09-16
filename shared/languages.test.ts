import { describe, expect, it } from 'vitest';
import {
  EXPLANATION_LANGUAGES,
  LANGUAGE_INFO,
  UI_LANGUAGES,
  isExplanationLanguage,
  isUiLanguage,
} from './languages.js';

describe('languages', () => {
  it('recognises supported interface and explanation languages only', () => {
    expect(isUiLanguage('te')).toBe(true);
    expect(isUiLanguage('ta')).toBe(false);
    expect(isUiLanguage(null)).toBe(false);
    expect(isExplanationLanguage('ta')).toBe(true);
    expect(isExplanationLanguage('fr')).toBe(false);
    expect(isExplanationLanguage(42)).toBe(false);
  });

  it('offers every interface language for explanations, with Indian speech tags', () => {
    for (const language of UI_LANGUAGES) expect(EXPLANATION_LANGUAGES).toContain(language);
    for (const language of EXPLANATION_LANGUAGES) {
      expect(LANGUAGE_INFO[language].speechTag).toMatch(/^[a-z]{2}-IN$/);
      expect(LANGUAGE_INFO[language].nativeName.length).toBeGreaterThan(0);
    }
  });
});
