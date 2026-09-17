import type { UiLanguage } from '../../shared/languages';
import { en, type MessageKey, type Messages } from './messages/en';

/**
 * English ships with the app; Hindi and Telugu load on demand, so readers download
 * only the interface language they use.
 */
const loaded: Partial<Record<UiLanguage, Messages>> = { en };

const LOADERS: Record<Exclude<UiLanguage, 'en'>, () => Promise<Messages>> = {
  hi: async () => (await import('./messages/hi')).hi,
  te: async () => (await import('./messages/te')).te,
};

export function hasMessages(language: UiLanguage): boolean {
  return Boolean(loaded[language]);
}

export async function loadMessages(language: UiLanguage): Promise<void> {
  if (language === 'en' || loaded[language]) return;
  loaded[language] = await LOADERS[language]();
}

export type MessageValues = Record<string, string | number>;

/** Looks up a message and fills `{placeholders}`. Unknown placeholders are left visible. */
export function formatMessage(
  language: UiLanguage,
  key: MessageKey,
  values: MessageValues = {},
): string {
  const template = (loaded[language] ?? en)[key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

const DATE_LOCALES: Record<UiLanguage, string> = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN' };

/** Formats a YYYY-MM-DD date for display, without timezone shifts. */
export function formatIsoDate(language: UiLanguage, isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat(DATE_LOCALES[language], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
