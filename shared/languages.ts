/**
 * Language catalogue shared by the UI and the API.
 *
 * - UI languages: the whole interface (buttons, menus, messages) is translated.
 * - Explanation languages: Gemini writes the explanations in these languages.
 */

export const UI_LANGUAGES = ['en', 'hi', 'te'] as const;
export type UiLanguage = (typeof UI_LANGUAGES)[number];

export const EXPLANATION_LANGUAGES = [
  'en',
  'hi',
  'te',
  'ta',
  'kn',
  'ml',
  'mr',
  'bn',
  'gu',
  'pa',
] as const;
export type ExplanationLanguage = (typeof EXPLANATION_LANGUAGES)[number];

export interface LanguageInfo {
  /** Name written in the language itself, so users can recognise it without reading English. */
  nativeName: string;
  /** English name, used in prompts sent to the model. */
  englishName: string;
  /** BCP-47 tag used for text-to-speech and speech recognition. */
  speechTag: string;
}

export const LANGUAGE_INFO: Record<ExplanationLanguage, LanguageInfo> = {
  en: { nativeName: 'English', englishName: 'English', speechTag: 'en-IN' },
  hi: { nativeName: 'हिन्दी', englishName: 'Hindi', speechTag: 'hi-IN' },
  te: { nativeName: 'తెలుగు', englishName: 'Telugu', speechTag: 'te-IN' },
  ta: { nativeName: 'தமிழ்', englishName: 'Tamil', speechTag: 'ta-IN' },
  kn: { nativeName: 'ಕನ್ನಡ', englishName: 'Kannada', speechTag: 'kn-IN' },
  ml: { nativeName: 'മലയാളം', englishName: 'Malayalam', speechTag: 'ml-IN' },
  mr: { nativeName: 'मराठी', englishName: 'Marathi', speechTag: 'mr-IN' },
  bn: { nativeName: 'বাংলা', englishName: 'Bengali', speechTag: 'bn-IN' },
  gu: { nativeName: 'ગુજરાતી', englishName: 'Gujarati', speechTag: 'gu-IN' },
  pa: { nativeName: 'ਪੰਜਾਬੀ', englishName: 'Punjabi', speechTag: 'pa-IN' },
};

export function isUiLanguage(value: unknown): value is UiLanguage {
  return typeof value === 'string' && (UI_LANGUAGES as readonly string[]).includes(value);
}

export function isExplanationLanguage(value: unknown): value is ExplanationLanguage {
  return typeof value === 'string' && (EXPLANATION_LANGUAGES as readonly string[]).includes(value);
}
