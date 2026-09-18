import type { ExplanationLanguage } from '../../shared/languages';
import type { AnalysisResult } from '../../shared/schema';

/**
 * "Analyse once, translate the explanation": an analysis is written in one language;
 * showing it in another only needs its plain-language texts translated. Everything
 * else — clauses chosen, importance, who a clause favours, verified quotes (which stay
 * in the paper's own language), legal terms, dates and ids — is kept exactly, so every
 * language shows the same paper and the reader's notes and flags still match.
 */

export interface TranslatableText {
  id: string;
  text: string;
}

type Visit = (id: string, value: string, set: (text: string) => void) => void;

/** Visits every translatable text of an analysis with a stable id. */
function visitTexts(analysis: AnalysisResult, visit: Visit): void {
  visit('documentType', analysis.documentType, (text) => (analysis.documentType = text));
  visit('summary', analysis.summary, (text) => (analysis.summary = text));
  visit('urgency', analysis.urgency.reason, (text) => (analysis.urgency.reason = text));

  analysis.parties.forEach((party, index) =>
    visit(`party.${index}`, party.role, (text) => (party.role = text)),
  );

  const notice = analysis.notice;
  if (notice) {
    (['claim', 'demand', 'deadline', 'ifIgnored'] as const).forEach((field) =>
      visit(`notice.${field}`, notice[field], (text) => (notice[field] = text)),
    );
  }

  analysis.points.forEach((point, p) => {
    const base = `point.${p}`;
    visit(`${base}.title`, point.title, (text) => (point.title = text));
    visit(`${base}.simple`, point.simple, (text) => (point.simple = text));
    visit(`${base}.detailed`, point.detailed, (text) => (point.detailed = text));
    visit(`${base}.deadline`, point.deadline, (text) => (point.deadline = text));
    point.rules.forEach((rule, index) =>
      visit(`${base}.rule.${index}`, rule.action, (text) => (rule.action = text)),
    );
    point.conditions.forEach((condition, index) =>
      visit(`${base}.condition.${index}`, condition, (text) => (point.conditions[index] = text)),
    );
    point.consequences.forEach((consequence, index) =>
      visit(
        `${base}.consequence.${index}`,
        consequence,
        (text) => (point.consequences[index] = text),
      ),
    );
    // The legal word itself stays as written in the paper; only its meaning is translated.
    point.terms.forEach((term, index) =>
      visit(`${base}.term.${index}`, term.meaning, (text) => (term.meaning = text)),
    );
    const check = point.check;
    if (check) {
      visit(`${base}.check.question`, check.question, (text) => (check.question = text));
      visit(`${base}.check.explanation`, check.explanation, (text) => (check.explanation = text));
    }
  });

  analysis.keyDates.forEach((date, index) =>
    visit(`date.${index}`, date.label, (text) => (date.label = text)),
  );

  analysis.scenarios.forEach((scenario, s) => {
    visit(`scenario.${s}.title`, scenario.title, (text) => (scenario.title = text));
    scenario.nodes.forEach((node, index) =>
      visit(`scenario.${s}.node.${index}`, node.question, (text) => (node.question = text)),
    );
    scenario.outcomes.forEach((outcome, index) =>
      visit(`scenario.${s}.outcome.${index}`, outcome.text, (text) => (outcome.text = text)),
    );
  });

  analysis.lawyerQuestions.forEach((question, index) =>
    visit(`question.${index}`, question, (text) => (analysis.lawyerQuestions[index] = text)),
  );
}

/** The texts to send for translation (empty texts need no translation). */
export function collectTexts(analysis: AnalysisResult): TranslatableText[] {
  const texts: TranslatableText[] = [];
  visitTexts(structuredClone(analysis), (id, text) => {
    if (text.trim().length > 0) texts.push({ id, text });
  });
  return texts;
}

/** A copy of `analysis` in `language`, with translated texts put back by id. */
export function applyTexts(
  analysis: AnalysisResult,
  translated: readonly TranslatableText[],
  language: ExplanationLanguage,
): AnalysisResult {
  const byId = new Map(translated.map((item) => [item.id, item.text]));
  const copy = structuredClone(analysis);
  visitTexts(copy, (id, _text, set) => {
    const text = byId.get(id);
    if (text !== undefined && text.trim().length > 0) set(text);
  });
  return { ...copy, language };
}
