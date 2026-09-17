import type { ExplanationLanguage } from '../../shared/languages';
import type { AnalysisResult } from '../../shared/schema';
import type { MessageKey } from '../i18n/messages/en';

export type SampleId = 'rental' | 'rental-b' | 'notice';

export interface SampleData {
  text: string;
  analyses: Partial<Record<ExplanationLanguage, AnalysisResult>>;
}

export interface SampleDefinition {
  id: SampleId;
  titleKey: MessageKey;
  hintKey: MessageKey;
  /** Lazy-loaded so example content never weighs down the first page load. */
  load: () => Promise<SampleData>;
}

export const SAMPLES: readonly SampleDefinition[] = [
  {
    id: 'rental',
    titleKey: 'sampleRental',
    hintKey: 'sampleRentalHint',
    load: async () => (await import('./rental')).RENTAL_SAMPLE,
  },
  {
    id: 'rental-b',
    titleKey: 'sampleRentalB',
    hintKey: 'sampleRentalBHint',
    load: async () => (await import('./rental-b')).RENTAL_B_SAMPLE,
  },
  {
    id: 'notice',
    titleKey: 'sampleNotice',
    hintKey: 'sampleNoticeHint',
    load: async () => (await import('./notice')).NOTICE_SAMPLE,
  },
];
