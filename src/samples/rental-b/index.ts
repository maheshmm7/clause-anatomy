import { buildSampleAnalysis } from '../build';
import type { SampleData } from '../index';
import { RENTAL_B_TEXT } from './document';
import { RENTAL_B_EN } from './en';
import { RENTAL_B_SKELETON } from './skeleton';

/** English only: other languages are explained live by the AI when it is available. */
export const RENTAL_B_SAMPLE: SampleData = {
  text: RENTAL_B_TEXT,
  analyses: {
    en: buildSampleAnalysis(RENTAL_B_SKELETON, RENTAL_B_EN, 'en'),
  },
};
