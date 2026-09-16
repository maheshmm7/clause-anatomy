import type { AnalysisResult } from '../../shared/schema';
import type { MessageValues } from '../i18n/format';
import type { MessageKey } from '../i18n/messages/en';

/**
 * The lawyer-ready brief: turns what the reader did in the app (points they were
 * unsure about, questions the paper could not answer) into questions they can take
 * to a lawyer or legal aid clinic.
 */

type Translate = (key: MessageKey, values?: MessageValues) => string;

export type CheckOutcome = 'correct' | 'wrong' | 'unsure';

export interface AskedQuestion {
  question: string;
  basis: 'document' | 'general' | 'none';
}

export interface BriefInput {
  analysis: AnalysisResult;
  checks: Readonly<Record<string, CheckOutcome>>;
  asked: readonly AskedQuestion[];
}

/** Questions for a lawyer, in order: AI-suggested, not understood, not answered by the paper. */
export function collectLawyerQuestions(
  { analysis, checks, asked }: BriefInput,
  t: Translate,
): string[] {
  const unsure = analysis.points
    .filter((point) => checks[point.id] === 'wrong' || checks[point.id] === 'unsure')
    .map((point) => t('briefUnsurePoint', { title: point.title }));
  const unanswered = asked
    .filter((entry) => entry.basis !== 'document')
    .map((entry) => entry.question);
  return [...new Set([...analysis.lawyerQuestions, ...unsure, ...unanswered])];
}

/** Plain-text brief for copying, sharing (e.g. WhatsApp) or printing. */
export function buildBriefText(
  input: BriefInput,
  t: Translate,
  formatDate: (isoDate: string) => string,
): string {
  const { analysis } = input;
  const important = analysis.points.filter((point) => point.importance === 'high');
  const sections = [
    t('briefTitle', { documentType: analysis.documentType }),
    `${t('briefSummary')}:\n${analysis.summary}`,
  ];
  if (important.length > 0) {
    sections.push(
      `${t('briefPoints')}:\n${important.map((point) => `- ${point.title}: ${point.simple}`).join('\n')}`,
    );
  }
  if (analysis.keyDates.length > 0) {
    sections.push(
      `${t('briefDates')}:\n${analysis.keyDates.map((date) => `- ${formatDate(date.date)}: ${date.label}`).join('\n')}`,
    );
  }
  const questions = collectLawyerQuestions(input, t);
  if (questions.length > 0) {
    sections.push(
      `${t('briefQuestions')}:\n${questions.map((question, index) => `${index + 1}. ${question}`).join('\n')}`,
    );
  }
  sections.push(t('briefFooter'));
  return sections.join('\n\n');
}
