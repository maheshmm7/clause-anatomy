import { describe, expect, it } from 'vitest';
import { redact } from '../../shared/redact.js';
import { RENT_TEXT, rentAnalysis } from '../testing/fakes.js';
import { clip, isRealIsoDate, postprocessAnalysis, safePartyId } from './postprocess.js';

const SOURCE = redact(RENT_TEXT).text;

describe('postprocessAnalysis', () => {
  const result = postprocessAnalysis(rentAnalysis(), SOURCE, 'en');

  it('renumbers point ids and keeps references consistent', () => {
    expect(result.points.map((point) => point.id)).toEqual(['p1', 'p2', 'p3']);
    // Self-references are removed; references are mapped to new ids.
    expect(result.points[0]!.relatedPointIds).toEqual(['p2']);
    expect(result.points[1]!.relatedPointIds).toEqual(['p3']);
  });

  it('maps party ids to safe ids everywhere they are used', () => {
    expect(result.parties.map((party) => party.id)).toEqual(['lessor', 'tenant']);
    expect(result.points[0]!.favours).toBe('lessor');
    expect(result.points[0]!.rules[0]!.partyId).toBe('tenant');
  });

  it('verifies quotes and removes quizzes from unverified points', () => {
    expect(result.points.map((point) => point.verified)).toEqual([true, true, false]);
    expect(result.points[0]!.check).toBeDefined();
    expect(result.points[2]!.check).toBeUndefined();
  });

  it('downgrades "document" term sources when the term is not in the document', () => {
    expect(result.points[1]!.terms).toEqual([
      { term: 'forfeited', meaning: 'Lost for good', source: 'document' },
      { term: 'Transfer of Property Act', meaning: 'A general law on property', source: 'general' },
    ]);
  });

  it('keeps only real, unique dates in order', () => {
    expect(result.keyDates).toEqual([
      { date: '2026-06-01', label: 'Agreement signed', pointId: 'p1' },
    ]);
  });

  it('drops invalid scenarios and references to unverified points', () => {
    expect(result.scenarios).toHaveLength(1);
    expect(result.scenarios[0]!.nodes[0]!.pointIds).toEqual(['p2']);
  });

  it('tags the explanation language', () => {
    expect(result.language).toBe('en');
  });

  it('removes duplicate point ids from the model', () => {
    const analysis = rentAnalysis();
    analysis.points = [
      analysis.points[0]!,
      { ...analysis.points[1]!, id: 'a' },
      analysis.points[1]!,
    ];
    const deduped = postprocessAnalysis(analysis, SOURCE, 'en');
    expect(deduped.points.map((point) => point.title)).toEqual([
      'Monthly rent',
      'Renting to someone else',
    ]);
    expect(deduped.points[0]!.relatedPointIds).toEqual(['p2']);
  });

  it('falls back to "neutral" when favours names an unknown party', () => {
    const analysis = rentAnalysis();
    analysis.points[0]!.favours = 'someone';
    expect(postprocessAnalysis(analysis, SOURCE, 'en').points[0]!.favours).toBe('neutral');
  });

  it('applies the urgency safety net for notices', () => {
    const notice = rentAnalysis({
      category: 'notice',
      notice: {
        sender: 'Advocate',
        claim: 'Unpaid rent',
        demand: 'Pay',
        deadline: '15 days',
        ifIgnored: 'Case',
      },
    });
    const processed = postprocessAnalysis(
      notice,
      `${SOURCE}\nVacate the premises within 15 days or face eviction.`,
      'en',
    );
    expect(processed.urgency.level).toBe('urgent');
    expect(processed.notice?.demand).toBe('Pay');
  });

  it('clips runaway strings', () => {
    const analysis = rentAnalysis({ summary: 'x'.repeat(5_000) });
    expect(postprocessAnalysis(analysis, SOURCE, 'en').summary.length).toBeLessThanOrEqual(600);
  });
});

describe('helpers', () => {
  it('clip trims, strips control characters and adds an ellipsis', () => {
    expect(clip('  hello\u0000 world  ', 50)).toBe('hello world');
    expect(clip('abcdefghij', 5)).toBe('abcd…');
    expect(clip('line one\nline two', 50)).toBe('line one\nline two');
  });

  it('safePartyId slugifies or falls back', () => {
    expect(safePartyId('Tenant', 0)).toBe('tenant');
    expect(safePartyId('Second Party', 1)).toBe('second-party');
    expect(safePartyId('<script>', 2)).toBe('party3');
  });

  it('isRealIsoDate rejects impossible dates and other formats', () => {
    expect(isRealIsoDate('2026-09-26')).toBe(true);
    expect(isRealIsoDate('2026-02-29')).toBe(false);
    expect(isRealIsoDate('26-09-2026')).toBe(false);
  });
});
