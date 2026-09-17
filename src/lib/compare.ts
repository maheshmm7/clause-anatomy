import type { KeyDate, VerifiedPoint } from '../../shared/schema';
import { normalizeForMatch, tokenize } from '../../shared/text';

/**
 * Side-by-side comparison of two analysed papers, computed locally and
 * deterministically. Matching works best for papers of the same kind in the same
 * explanation language (it compares the plain-language titles and explanations).
 */

const STOPWORDS = new Set(
  'the a an and or of to in on for by with from at is are be this that your you it its as if not no can may must shall will'.split(
    ' ',
  ),
);

const AMOUNT_PATTERN = /(?:₹|rs\.?|inr)\s*([0-9][0-9,]*(?:\.[0-9]+)?)/gi;

/** Rupee amounts mentioned in the given texts, unique and largest first. */
export function extractAmounts(texts: readonly string[]): number[] {
  const amounts = new Set<number>();
  for (const text of texts) {
    for (const match of text.matchAll(AMOUNT_PATTERN)) {
      const value = Number((match[1] ?? '').replace(/,/g, ''));
      if (Number.isFinite(value) && value > 0) amounts.add(value);
    }
  }
  return [...amounts].sort((a, b) => b - a);
}

function keywords(point: VerifiedPoint): Set<string> {
  const text = normalizeForMatch(`${point.title} ${point.simple}`);
  return new Set(
    tokenize(text)
      .map((item) => item.token)
      .filter((token) => token.length > 2 && !STOPWORDS.has(token) && !/^[0-9]+$/.test(token)),
  );
}

export function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let shared = 0;
  for (const item of a) if (b.has(item)) shared += 1;
  return shared / (a.size + b.size - shared);
}

export interface ClauseMatch {
  a: VerifiedPoint;
  b: VerifiedPoint;
  score: number;
}

/** Greedy best-first pairing of similar clauses; the rest are reported as unique. */
export function matchClauses(
  pointsA: readonly VerifiedPoint[],
  pointsB: readonly VerifiedPoint[],
  threshold = 0.15,
): { pairs: ClauseMatch[]; onlyA: VerifiedPoint[]; onlyB: VerifiedPoint[] } {
  const keysA = pointsA.map(keywords);
  const keysB = pointsB.map(keywords);
  const candidates: { i: number; j: number; score: number }[] = [];
  keysA.forEach((ka, i) =>
    keysB.forEach((kb, j) => {
      const score = jaccard(ka, kb);
      if (score >= threshold) candidates.push({ i, j, score });
    }),
  );
  candidates.sort((x, y) => y.score - x.score || x.i - y.i);

  const usedA = new Set<number>();
  const usedB = new Set<number>();
  const pairs: ClauseMatch[] = [];
  for (const { i, j, score } of candidates) {
    const a = pointsA[i];
    const b = pointsB[j];
    if (!a || !b || usedA.has(i) || usedB.has(j)) continue;
    usedA.add(i);
    usedB.add(j);
    pairs.push({ a, b, score });
  }
  pairs.sort((x, y) => pointsA.indexOf(x.a) - pointsA.indexOf(y.a));
  return {
    pairs,
    onlyA: pointsA.filter((_, index) => !usedA.has(index)),
    onlyB: pointsB.filter((_, index) => !usedB.has(index)),
  };
}

export interface CompareFacts {
  clauses: number;
  highImportance: number;
  verified: number;
  dates: KeyDate[];
  amounts: number[];
}

export function compareFacts(points: readonly VerifiedPoint[], keyDates: KeyDate[]): CompareFacts {
  return {
    clauses: points.length,
    highImportance: points.filter((point) => point.importance === 'high').length,
    verified: points.filter((point) => point.verified).length,
    dates: keyDates,
    amounts: extractAmounts(points.map((point) => point.quote)).slice(0, 4),
  };
}
