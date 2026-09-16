import { buildSampleAnalysis } from '../build';
import type { SampleData } from '../index';
import { RENTAL_TEXT } from './document';
import { RENTAL_EN } from './en';
import { RENTAL_HI } from './hi';
import { RENTAL_SKELETON } from './skeleton';
import { RENTAL_TE } from './te';

export const RENTAL_SAMPLE: SampleData = {
  text: RENTAL_TEXT,
  analyses: {
    en: buildSampleAnalysis(RENTAL_SKELETON, RENTAL_EN, 'en'),
    hi: buildSampleAnalysis(RENTAL_SKELETON, RENTAL_HI, 'hi'),
    te: buildSampleAnalysis(RENTAL_SKELETON, RENTAL_TE, 'te'),
  },
};
