import { buildSampleAnalysis } from '../build';
import type { SampleData } from '../index';
import { NOTICE_TEXT } from './document';
import { NOTICE_EN } from './en';
import { NOTICE_SKELETON } from './skeleton';

/** English only: other languages are explained live by the AI when it is available. */
export const NOTICE_SAMPLE: SampleData = {
  text: NOTICE_TEXT,
  analyses: {
    en: buildSampleAnalysis(NOTICE_SKELETON, NOTICE_EN, 'en'),
  },
};
