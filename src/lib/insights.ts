import type { Party, VerifiedPoint } from '../../shared/schema';
import { normalizeForMatch } from '../../shared/text';
import { locateQuote, prepareSource } from '../../shared/verifyQuote';
import type { Perspective } from './perspective';

/**
 * Dashboard insights computed locally from a verified analysis — no extra AI calls.
 * Everything here is pure and deterministic so the dashboard is fast and testable.
 */

export type Side = 'you' | 'balanced' | 'others';

/** Which side a clause favours, from the reader's point of view. */
export function sideOf(point: VerifiedPoint, perspective: Perspective): Side {
  if (point.favours === 'both' || point.favours === 'neutral' || perspective === null) {
    return 'balanced';
  }
  return point.favours === perspective ? 'you' : 'others';
}

export interface FairnessCounts {
  you: number;
  balanced: number;
  others: number;
}

export function fairnessForReader(
  points: readonly VerifiedPoint[],
  perspective: Perspective,
): FairnessCounts {
  const counts: FairnessCounts = { you: 0, balanced: 0, others: 0 };
  for (const point of points) counts[sideOf(point, perspective)] += 1;
  return counts;
}

/** Without a chosen role: how many clauses favour each party. */
export function fairnessByParty(
  points: readonly VerifiedPoint[],
  parties: readonly Party[],
): { partyId: string | null; count: number }[] {
  const rows = parties.map((party) => ({
    partyId: party.id as string | null,
    count: points.filter((point) => point.favours === party.id).length,
  }));
  const balanced = points.filter(
    (point) => !parties.some((party) => party.id === point.favours),
  ).length;
  return [...rows, { partyId: null, count: balanced }];
}

export const IMPORTANCE_ORDER = ['high', 'medium', 'low'] as const;

/** Clauses grouped by importance (rows) and the side they favour (columns). */
export function riskMatrix(
  points: readonly VerifiedPoint[],
  perspective: Perspective,
): Record<VerifiedPoint['importance'], Record<Side, VerifiedPoint[]>> {
  const empty = (): Record<Side, VerifiedPoint[]> => ({ you: [], balanced: [], others: [] });
  const matrix = { high: empty(), medium: empty(), low: empty() };
  for (const point of points) matrix[point.importance][sideOf(point, perspective)].push(point);
  return matrix;
}

/** Whole days from `todayIso` to `isoDate` (both YYYY-MM-DD, compared in UTC). */
export function daysUntil(isoDate: string, todayIso: string): number {
  const day = 24 * 60 * 60 * 1000;
  return Math.round(
    (Date.parse(`${isoDate}T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`)) / day,
  );
}

export interface GlossaryEntry {
  term: string;
  meaning: string;
  source: 'document' | 'general';
  pointIds: string[];
}

/** Every term across the paper, de-duplicated and sorted, with the clauses that use it. */
export function collectGlossary(points: readonly VerifiedPoint[]): GlossaryEntry[] {
  const entries = new Map<string, GlossaryEntry>();
  for (const point of points) {
    for (const term of point.terms) {
      const key = normalizeForMatch(term.term);
      const existing = entries.get(key);
      if (existing) {
        if (!existing.pointIds.includes(point.id)) existing.pointIds.push(point.id);
        if (term.source === 'document') existing.source = 'document';
      } else {
        entries.set(key, { ...term, pointIds: [point.id] });
      }
    }
  }
  return [...entries.values()].sort((a, b) => a.term.localeCompare(b.term));
}

/** "What can go wrong": every consequence, most important clauses first. */
export function collectConsequences(
  points: readonly VerifiedPoint[],
): { pointId: string; text: string }[] {
  return IMPORTANCE_ORDER.flatMap((importance) =>
    points
      .filter((point) => point.importance === importance)
      .flatMap((point) => point.consequences.map((text) => ({ pointId: point.id, text }))),
  );
}

export interface Annotation {
  pointId: string;
  number: number;
  start: number;
  end: number;
}

/**
 * Where each verified clause sits in the document, for margin-note highlighting.
 * Overlapping quotes keep the earlier one so highlights never nest.
 */
export function annotationRanges(text: string, points: readonly VerifiedPoint[]): Annotation[] {
  const prepared = prepareSource(text);
  const found = points.flatMap((point, index) => {
    if (!point.verified) return [];
    const range = locateQuote(prepared, point.quote);
    return range ? [{ pointId: point.id, number: index + 1, ...range }] : [];
  });
  found.sort((a, b) => a.start - b.start);
  const result: Annotation[] = [];
  for (const annotation of found) {
    const previous = result.at(-1);
    if (!previous || annotation.start >= previous.end) result.push(annotation);
  }
  return result;
}

/** A readable window of text around a range, for "in the document" context. */
export function contextSnippet(
  text: string,
  range: { start: number; end: number },
  radius = 220,
): { before: string; match: string; after: string; clippedStart: boolean; clippedEnd: boolean } {
  const from = Math.max(0, range.start - radius);
  const to = Math.min(text.length, range.end + radius);
  return {
    before: text.slice(from, range.start),
    match: text.slice(range.start, range.end),
    after: text.slice(range.end, to),
    clippedStart: from > 0,
    clippedEnd: to < text.length,
  };
}
