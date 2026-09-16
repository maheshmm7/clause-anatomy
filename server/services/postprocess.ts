import type { ExplanationLanguage } from '../../shared/languages.js';
import type {
  Analysis,
  AnalysisResult,
  KeyDate,
  Point,
  Scenario,
  VerifiedPoint,
} from '../../shared/schema.js';
import { sanitizeScenarios } from '../../shared/scenario.js';
import { normalizeForMatch } from '../../shared/text.js';
import { resolveUrgency } from '../../shared/urgency.js';
import { locateQuote, prepareSource, type PreparedSource } from '../../shared/verifyQuote.js';

/**
 * Turns raw model output into a safe, grounded result:
 *  - clips every string (defends against runaway output) and strips control characters,
 *  - re-numbers ids so they are unique and predictable,
 *  - verifies each quote against the document and removes quizzes on unverified points,
 *  - downgrades "from your document" term meanings when the term is not in the document,
 *  - drops invalid dates and invalid what-if trees,
 *  - applies the deterministic urgency safety net.
 */

// Control characters are matched on purpose: they are stripped from model output.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function clip(value: string, max: number): string {
  const clean = value.replace(CONTROL_CHARS, '').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

const clipAll = (values: string[], max: number): string[] =>
  values.map((value) => clip(value, max)).filter((value) => value.length > 0);

const SAFE_ID = /^[a-z0-9_-]{1,32}$/;

export function safePartyId(id: string, index: number): string {
  const slug = id.toLowerCase().trim().replace(/\s+/g, '-');
  return SAFE_ID.test(slug) ? slug : `party${index + 1}`;
}

export function isRealIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

interface Context {
  prepared: PreparedSource;
  normalizedSource: string;
  pointIdMap: Map<string, string>;
  /** Model party id (lower-cased) → safe party id. */
  partyIdMap: Map<string, string>;
}

function mapPointIds(ids: string[], context: Context, exclude?: string): string[] {
  const mapped = ids
    .map((id) => context.pointIdMap.get(id))
    .filter((id): id is string => id !== undefined && id !== exclude);
  return [...new Set(mapped)];
}

function processPoint(point: Point, newId: string, context: Context): VerifiedPoint {
  const quote = clip(point.quote, 600);
  const verified = locateQuote(context.prepared, quote) !== null;
  const favours =
    context.partyIdMap.get(point.favours.toLowerCase()) ?? point.favours.toLowerCase();
  const knownParty = new Set(context.partyIdMap.values()).has(favours);

  return {
    id: newId,
    title: clip(point.title, 120),
    sourceLabel: clip(point.sourceLabel, 60),
    quote,
    simple: clip(point.simple, 500),
    detailed: clip(point.detailed, 1200),
    importance: point.importance,
    favours: knownParty || favours === 'both' ? favours : 'neutral',
    rules: point.rules
      .map((rule) => ({
        type: rule.type,
        partyId: context.partyIdMap.get(rule.partyId.toLowerCase()) ?? rule.partyId.toLowerCase(),
        action: clip(rule.action, 300),
      }))
      .filter((rule) => rule.action.length > 0),
    conditions: clipAll(point.conditions, 300),
    consequences: clipAll(point.consequences, 300),
    relatedPointIds: mapPointIds(point.relatedPointIds, context, newId),
    deadline: clip(point.deadline, 200),
    terms: point.terms
      .map((term) => {
        const name = clip(term.term, 80);
        const inDocument = context.normalizedSource.includes(normalizeForMatch(name));
        return {
          term: name,
          meaning: clip(term.meaning, 400),
          source: term.source === 'document' && inDocument ? 'document' : 'general',
        } as const;
      })
      .filter((term) => term.term.length > 0 && term.meaning.length > 0),
    // Never quiz a reader on a point we could not ground in their document.
    ...(verified && point.check
      ? {
          check: {
            question: clip(point.check.question, 400),
            answer: point.check.answer,
            explanation: clip(point.check.explanation, 500),
          },
        }
      : {}),
    verified,
  };
}

function processKeyDates(keyDates: KeyDate[], context: Context): KeyDate[] {
  const seen = new Set<string>();
  const result: KeyDate[] = [];
  for (const keyDate of keyDates) {
    const label = clip(keyDate.label, 200);
    const key = `${keyDate.date}|${label}`;
    if (!isRealIsoDate(keyDate.date) || label.length === 0 || seen.has(key)) continue;
    seen.add(key);
    result.push({
      date: keyDate.date,
      label,
      pointId: context.pointIdMap.get(keyDate.pointId) ?? '',
    });
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

function processScenarios(
  scenarios: Scenario[],
  context: Context,
  verifiedIds: Set<string>,
): Scenario[] {
  const clipped = scenarios.map((scenario) => ({
    id: clip(scenario.id, 32),
    title: clip(scenario.title, 150),
    startId: clip(scenario.startId, 32),
    nodes: scenario.nodes.map((node) => ({
      id: clip(node.id, 32),
      question: clip(node.question, 300),
      yes: clip(node.yes, 32),
      no: clip(node.no, 32),
      pointIds: mapPointIds(node.pointIds, context),
    })),
    outcomes: scenario.outcomes.map((outcome) => ({
      id: clip(outcome.id, 32),
      text: clip(outcome.text, 500),
      tone: outcome.tone,
      pointIds: mapPointIds(outcome.pointIds, context),
    })),
  }));
  const unique = clipped.filter(
    (scenario, index) => clipped.findIndex((other) => other.id === scenario.id) === index,
  );
  return sanitizeScenarios(unique, verifiedIds);
}

export function postprocessAnalysis(
  analysis: Analysis,
  sourceText: string,
  language: ExplanationLanguage,
): AnalysisResult {
  const prepared = prepareSource(sourceText);
  const partyIdMap = new Map<string, string>();
  const parties = analysis.parties.map((party, index) => {
    const id = safePartyId(party.id, index);
    partyIdMap.set(party.id.toLowerCase(), id);
    return { id, name: clip(party.name, 120), role: clip(party.role, 60) };
  });

  const seenIds = new Set<string>();
  const uniquePoints = analysis.points.filter((point) => {
    if (seenIds.has(point.id)) return false;
    seenIds.add(point.id);
    return true;
  });
  const pointIdMap = new Map(uniquePoints.map((point, index) => [point.id, `p${index + 1}`]));

  const context: Context = {
    prepared,
    normalizedSource: prepared.normalized.value,
    pointIdMap,
    partyIdMap,
  };

  const points = uniquePoints.map((point, index) => processPoint(point, `p${index + 1}`, context));
  const verifiedIds = new Set(points.filter((point) => point.verified).map((point) => point.id));

  const notice = analysis.notice
    ? {
        sender: clip(analysis.notice.sender, 400),
        claim: clip(analysis.notice.claim, 400),
        demand: clip(analysis.notice.demand, 400),
        deadline: clip(analysis.notice.deadline, 400),
        ifIgnored: clip(analysis.notice.ifIgnored, 400),
      }
    : undefined;

  return {
    category: analysis.category,
    documentType: clip(analysis.documentType, 120),
    summary: clip(analysis.summary, 600),
    parties,
    urgency: {
      level: resolveUrgency(analysis.urgency.level, analysis.category, sourceText),
      reason: clip(analysis.urgency.reason, 300),
    },
    ...(notice ? { notice } : {}),
    points,
    keyDates: processKeyDates(analysis.keyDates, context),
    scenarios: processScenarios(analysis.scenarios, context, verifiedIds),
    lawyerQuestions: clipAll(analysis.lawyerQuestions, 300),
    language,
  };
}
