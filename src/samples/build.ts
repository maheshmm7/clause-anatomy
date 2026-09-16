import type { ExplanationLanguage } from '../../shared/languages';
import type {
  AnalysisResult,
  DocumentCategory,
  Rule,
  Scenario,
  ScenarioOutcome,
  VerifiedPoint,
} from '../../shared/schema';

/**
 * Built-in examples are pre-computed so the app is fully usable without an API key
 * or network quota. Structure (ids, quotes, rules, trees) is defined once; each
 * language only supplies the words. Tests check every example against the same
 * schema, quote verification and scenario validation used for live AI output.
 */

export interface PointSkeleton {
  id: string;
  sourceLabel: string;
  /** Verbatim text from the example document. */
  quote: string;
  importance: VerifiedPoint['importance'];
  favours: string;
  rules: Omit<Rule, 'action'>[];
  relatedPointIds: string[];
  terms: { term: string; source: 'document' | 'general' }[];
  checkAnswer?: 'yes' | 'no';
}

export interface ScenarioSkeleton {
  id: string;
  startId: string;
  nodes: { id: string; yes: string; no: string; pointIds: string[] }[];
  outcomes: { id: string; tone: ScenarioOutcome['tone']; pointIds: string[] }[];
}

export interface SampleSkeleton {
  category: DocumentCategory;
  urgency: AnalysisResult['urgency']['level'];
  parties: { id: string; name: string }[];
  points: PointSkeleton[];
  keyDates: { date: string; pointId: string }[];
  scenarios: ScenarioSkeleton[];
  hasNotice: boolean;
}

export interface PointWords {
  title: string;
  simple: string;
  detailed: string;
  /** One action per skeleton rule, same order. */
  rules: string[];
  conditions: string[];
  consequences: string[];
  deadline: string;
  /** One meaning per skeleton term, same order. */
  terms: string[];
  check?: { question: string; explanation: string };
}

export interface SampleWords {
  documentType: string;
  summary: string;
  urgencyReason: string;
  partyRoles: Record<string, string>;
  notice?: AnalysisResult['notice'];
  points: Record<string, PointWords>;
  keyDates: string[];
  scenarios: Record<
    string,
    { title: string; questions: Record<string, string>; outcomes: Record<string, string> }
  >;
  lawyerQuestions: string[];
}

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`Sample is missing ${what}`);
  return value;
}

function sameLength(a: readonly unknown[], b: readonly unknown[], what: string): void {
  if (a.length !== b.length)
    throw new Error(`Sample ${what}: expected ${a.length} items, got ${b.length}`);
}

function buildPoint(skeleton: PointSkeleton, words: PointWords): VerifiedPoint {
  sameLength(skeleton.rules, words.rules, `${skeleton.id} rules`);
  sameLength(skeleton.terms, words.terms, `${skeleton.id} terms`);
  if (Boolean(skeleton.checkAnswer) !== Boolean(words.check)) {
    throw new Error(`Sample ${skeleton.id}: check question and answer must both be present`);
  }
  return {
    id: skeleton.id,
    title: words.title,
    sourceLabel: skeleton.sourceLabel,
    quote: skeleton.quote,
    simple: words.simple,
    detailed: words.detailed,
    importance: skeleton.importance,
    favours: skeleton.favours,
    rules: skeleton.rules.map((rule, index) => ({
      ...rule,
      action: required(words.rules[index], 'rule'),
    })),
    conditions: words.conditions,
    consequences: words.consequences,
    relatedPointIds: skeleton.relatedPointIds,
    deadline: words.deadline,
    terms: skeleton.terms.map((term, index) => ({
      ...term,
      meaning: required(words.terms[index], 'term'),
    })),
    ...(skeleton.checkAnswer && words.check
      ? {
          check: {
            question: words.check.question,
            answer: skeleton.checkAnswer,
            explanation: words.check.explanation,
          },
        }
      : {}),
    verified: true,
  };
}

function buildScenario(
  skeleton: ScenarioSkeleton,
  words: SampleWords['scenarios'][string],
): Scenario {
  return {
    id: skeleton.id,
    title: words.title,
    startId: skeleton.startId,
    nodes: skeleton.nodes.map((node) => ({
      ...node,
      question: required(words.questions[node.id], node.id),
    })),
    outcomes: skeleton.outcomes.map((outcome) => ({
      ...outcome,
      text: required(words.outcomes[outcome.id], outcome.id),
    })),
  };
}

export function buildSampleAnalysis(
  skeleton: SampleSkeleton,
  words: SampleWords,
  language: ExplanationLanguage,
): AnalysisResult {
  sameLength(skeleton.keyDates, words.keyDates, 'keyDates');
  return {
    category: skeleton.category,
    documentType: words.documentType,
    summary: words.summary,
    parties: skeleton.parties.map((party) => ({
      ...party,
      role: required(words.partyRoles[party.id], `role for ${party.id}`),
    })),
    urgency: { level: skeleton.urgency, reason: words.urgencyReason },
    ...(skeleton.hasNotice ? { notice: required(words.notice, 'notice summary') } : {}),
    points: skeleton.points.map((point) =>
      buildPoint(point, required(words.points[point.id], `words for ${point.id}`)),
    ),
    keyDates: skeleton.keyDates.map((keyDate, index) => ({
      ...keyDate,
      label: required(words.keyDates[index], 'key date label'),
    })),
    scenarios: skeleton.scenarios.map((scenario) =>
      buildScenario(scenario, required(words.scenarios[scenario.id], `words for ${scenario.id}`)),
    ),
    lawyerQuestions: words.lawyerQuestions,
    language,
  };
}
