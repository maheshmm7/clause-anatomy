import { describe, expect, it } from 'vitest';
import type { VerifiedPoint } from '../../shared/schema';
import { RENTAL_B_SAMPLE } from '../samples/rental-b';
import { RENTAL_SAMPLE } from '../samples/rental';
import { compareFacts, extractAmounts, jaccard, matchClauses } from './compare';
import {
  annotationRanges,
  collectConsequences,
  collectGlossary,
  contextSnippet,
  daysUntil,
  fairnessByParty,
  fairnessForReader,
  riskMatrix,
  sideOf,
} from './insights';

const rental = RENTAL_SAMPLE.analyses.en!;
const rentalB = RENTAL_B_SAMPLE.analyses.en!;
const byId = (id: string): VerifiedPoint => rental.points.find((point) => point.id === id)!;

describe('fairness and risk', () => {
  it('places each clause on the reader’s side, the other side or balanced', () => {
    expect(sideOf(byId('p1'), 'lessee')).toBe('others');
    expect(sideOf(byId('p1'), 'lessor')).toBe('you');
    expect(sideOf(byId('p3'), 'lessee')).toBe('balanced');
    expect(sideOf(byId('p1'), null)).toBe('balanced');
  });

  it('counts clauses per side for a reader and per party without one', () => {
    expect(fairnessForReader(rental.points, 'lessee')).toEqual({ you: 0, balanced: 6, others: 5 });
    expect(fairnessByParty(rental.points, rental.parties)).toEqual([
      { partyId: 'lessor', count: 5 },
      { partyId: 'lessee', count: 0 },
      { partyId: null, count: 6 },
    ]);
  });

  it('builds an importance × side matrix containing every clause once', () => {
    const matrix = riskMatrix(rental.points, 'lessee');
    expect(matrix.high.others.map((point) => point.id)).toEqual(['p1', 'p2', 'p4']);
    expect(matrix.low.balanced.map((point) => point.id)).toEqual(['p10', 'p11']);
    const all = Object.values(matrix).flatMap((row) => Object.values(row).flat());
    expect(all).toHaveLength(rental.points.length);
  });

  it('lists consequences with the most important clauses first', () => {
    const consequences = collectConsequences(rental.points);
    const importance = consequences.map((item) => byId(item.pointId).importance);
    expect(importance).toEqual(
      [...importance].sort(
        (a, b) => ['high', 'medium', 'low'].indexOf(a) - ['high', 'medium', 'low'].indexOf(b),
      ),
    );
    expect(consequences.length).toBeGreaterThan(0);
  });
});

describe('dates, glossary and annotations', () => {
  it('counts whole days in both directions', () => {
    expect(daysUntil('2026-09-20', '2026-09-17')).toBe(3);
    expect(daysUntil('2026-09-17', '2026-09-17')).toBe(0);
    expect(daysUntil('2026-08-01', '2026-09-17')).toBe(-47);
  });

  it('merges repeated terms, keeps the strongest source and sorts them', () => {
    const points: VerifiedPoint[] = [
      {
        ...byId('p1'),
        id: 'x1',
        terms: [{ term: 'Lessee', meaning: 'Tenant', source: 'general' }],
      },
      {
        ...byId('p2'),
        id: 'x2',
        terms: [
          { term: 'lessee', meaning: 'Tenant', source: 'document' },
          { term: 'Deposit', meaning: 'Money kept safe', source: 'general' },
        ],
      },
    ];
    expect(collectGlossary(points)).toEqual([
      { term: 'Deposit', meaning: 'Money kept safe', source: 'general', pointIds: ['x2'] },
      { term: 'Lessee', meaning: 'Tenant', source: 'document', pointIds: ['x1', 'x2'] },
    ]);
  });

  it('finds verified quotes in the paper without overlapping highlights', () => {
    const ranges = annotationRanges(RENTAL_SAMPLE.text, rental.points);
    expect(ranges.length).toBeGreaterThan(5);
    ranges.forEach((range, index) => {
      expect(range.end).toBeGreaterThan(range.start);
      const next = ranges[index + 1];
      if (next) expect(next.start).toBeGreaterThanOrEqual(range.end);
    });
    const unverified = rental.points.map((point) => ({ ...point, verified: false }));
    expect(annotationRanges(RENTAL_SAMPLE.text, unverified)).toEqual([]);
  });

  it('cuts a readable context window around a match', () => {
    const text = 'aaaa MATCH bbbb';
    expect(contextSnippet(text, { start: 5, end: 10 }, 2)).toEqual({
      before: 'a ',
      match: 'MATCH',
      after: ' b',
      clippedStart: true,
      clippedEnd: true,
    });
    expect(contextSnippet(text, { start: 5, end: 10 })).toMatchObject({
      before: 'aaaa ',
      clippedStart: false,
      clippedEnd: false,
    });
  });
});

describe('compare', () => {
  it('extracts rupee amounts in common Indian formats', () => {
    expect(extractAmounts(['Rs. 22,000 and ₹1,50,000', 'INR 500.50', 'rs 22000', 'Rs. 0'])).toEqual(
      [150000, 22000, 500.5],
    );
  });

  it('measures keyword overlap', () => {
    expect(jaccard(new Set(['rent', 'deposit']), new Set(['rent']))).toBe(0.5);
    expect(jaccard(new Set(), new Set())).toBe(0);
  });

  it('pairs similar clauses once each and reports the rest', () => {
    const { pairs, onlyA, onlyB } = matchClauses(rentalB.points, rental.points);
    expect(pairs.length).toBeGreaterThanOrEqual(6);
    const titles = pairs.map((pair) => [pair.a.title, pair.b.title]);
    expect(titles).toContainEqual(['Getting your deposit back', 'Getting your deposit back']);
    expect(new Set(pairs.map((pair) => pair.b.id)).size).toBe(pairs.length);
    expect(pairs.length + onlyA.length).toBe(rentalB.points.length);
    expect(pairs.length + onlyB.length).toBe(rental.points.length);
    expect(matchClauses(rental.points, [])).toMatchObject({ pairs: [], onlyB: [] });
  });

  it('summarises key facts for the comparison table', () => {
    const facts = compareFacts(rental.points, rental.keyDates);
    expect(facts).toMatchObject({ clauses: 11, highImportance: 5, verified: 11 });
    expect(facts.amounts).toEqual([22000, 2500]);
  });
});
