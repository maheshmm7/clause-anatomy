import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import type { UiLanguage } from '../../shared/languages';
import { formatIsoDate, formatMessage, type MessageValues } from './format';
import type { MessageKey } from './messages/en';

export interface I18nValue {
  language: UiLanguage;
  t: (key: MessageKey, values?: MessageValues) => string;
  formatDate: (isoDate: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  language,
  children,
}: {
  language: UiLanguage;
  children: ReactNode;
}) {
  // Screen readers choose pronunciation from the page language.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (key: MessageKey, values?: MessageValues) => formatMessage(language, key, values),
    [language],
  );
  const formatDate = useCallback((isoDate: string) => formatIsoDate(language, isoDate), [language]);
  const value = useMemo(() => ({ language, t, formatDate }), [language, t, formatDate]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>');
  return value;
}
