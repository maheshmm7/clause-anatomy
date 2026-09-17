import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  isExplanationLanguage,
  isUiLanguage,
  type ExplanationLanguage,
  type UiLanguage,
} from '../../shared/languages';
import { readPreference, writePreference } from '../lib/storage';

export type ReadingLevel = 'simple' | 'detailed';
export type ThemePreference = 'system' | 'light' | 'dark';
export type TextSize = 'normal' | 'large' | 'xlarge';

export const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark'];
export const TEXT_SIZES: readonly TextSize[] = ['normal', 'large', 'xlarge'];

export interface Settings {
  uiLanguage: UiLanguage;
  explanationLanguage: ExplanationLanguage;
  readingLevel: ReadingLevel;
  theme: ThemePreference;
  textSize: TextSize;
  setUiLanguage: (language: UiLanguage) => void;
  setExplanationLanguage: (language: ExplanationLanguage) => void;
  setReadingLevel: (level: ReadingLevel) => void;
  setTheme: (theme: ThemePreference) => void;
  setTextSize: (size: TextSize) => void;
}

const SettingsContext = createContext<Settings | null>(null);

function stored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const value = readPreference(key);
  return (allowed as readonly string[]).includes(value ?? '') ? (value as T) : fallback;
}

/** First visit: follow the browser's language when we support it, else English. */
export function detectUiLanguage(preferred: readonly string[]): UiLanguage {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0];
    if (isUiLanguage(base)) return base;
  }
  return 'en';
}

export function storedUiLanguage(): UiLanguage {
  const value = readPreference('uiLanguage');
  if (isUiLanguage(value)) return value;
  return detectUiLanguage(typeof navigator === 'undefined' ? [] : navigator.languages);
}

function storedExplanationLanguage(fallback: UiLanguage): ExplanationLanguage {
  const value = readPreference('explanationLanguage');
  return isExplanationLanguage(value) ? value : fallback;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [uiLanguage, setUi] = useState<UiLanguage>(storedUiLanguage);
  const [explanationLanguage, setExplanation] = useState<ExplanationLanguage>(() =>
    storedExplanationLanguage(storedUiLanguage()),
  );
  const [readingLevel, setLevel] = useState<ReadingLevel>(() =>
    stored('readingLevel', ['simple', 'detailed'], 'simple'),
  );
  const [theme, setThemeState] = useState<ThemePreference>(() => stored('theme', THEMES, 'system'));
  const [textSize, setTextSizeState] = useState<TextSize>(() =>
    stored('textSize', TEXT_SIZES, 'normal'),
  );

  // Theme and text size are applied on <html> so every screen, including the landing page, follows them.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;
    root.dataset.textSize = textSize;
  }, [theme, textSize]);

  const value = useMemo<Settings>(
    () => ({
      uiLanguage,
      explanationLanguage,
      readingLevel,
      theme,
      textSize,
      setUiLanguage: (language) => {
        setUi(language);
        writePreference('uiLanguage', language);
        // Most people want explanations in the language they read the app in.
        setExplanation(language);
        writePreference('explanationLanguage', language);
      },
      setExplanationLanguage: (language) => {
        setExplanation(language);
        writePreference('explanationLanguage', language);
      },
      setReadingLevel: (level) => {
        setLevel(level);
        writePreference('readingLevel', level);
      },
      setTheme: (next) => {
        setThemeState(next);
        writePreference('theme', next);
      },
      setTextSize: (size) => {
        setTextSizeState(size);
        writePreference('textSize', size);
      },
    }),
    [uiLanguage, explanationLanguage, readingLevel, theme, textSize],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Settings {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside <SettingsProvider>');
  return value;
}
