import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  isExplanationLanguage,
  isUiLanguage,
  type ExplanationLanguage,
  type UiLanguage,
} from '../../shared/languages';
import { readPreference, writePreference } from '../lib/storage';

export type ReadingLevel = 'simple' | 'detailed';

export interface Settings {
  /** `null` until the user picks a language on their first visit. */
  uiLanguage: UiLanguage | null;
  explanationLanguage: ExplanationLanguage;
  readingLevel: ReadingLevel;
  setUiLanguage: (language: UiLanguage) => void;
  setExplanationLanguage: (language: ExplanationLanguage) => void;
  setReadingLevel: (level: ReadingLevel) => void;
}

const SettingsContext = createContext<Settings | null>(null);

function storedUiLanguage(): UiLanguage | null {
  const stored = readPreference('uiLanguage');
  return isUiLanguage(stored) ? stored : null;
}

function storedExplanationLanguage(fallback: UiLanguage | null): ExplanationLanguage {
  const stored = readPreference('explanationLanguage');
  return isExplanationLanguage(stored) ? stored : (fallback ?? 'en');
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [uiLanguage, setUi] = useState<UiLanguage | null>(storedUiLanguage);
  const [explanationLanguage, setExplanation] = useState<ExplanationLanguage>(() =>
    storedExplanationLanguage(storedUiLanguage()),
  );
  const [readingLevel, setLevel] = useState<ReadingLevel>(() =>
    readPreference('readingLevel') === 'detailed' ? 'detailed' : 'simple',
  );

  const value = useMemo<Settings>(
    () => ({
      uiLanguage,
      explanationLanguage,
      readingLevel,
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
    }),
    [uiLanguage, explanationLanguage, readingLevel],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Settings {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside <SettingsProvider>');
  return value;
}
