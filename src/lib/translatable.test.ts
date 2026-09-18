import { describe, expect, it } from 'vitest';
import { RENTAL_SAMPLE } from '../samples/rental';
import { NOTICE_SAMPLE } from '../samples/notice';
import { applyTexts, collectTexts } from './translatable';

const rental = RENTAL_SAMPLE.analyses.en!;

describe('translating an explanation (analyse once, translate the texts)', () => {
  it('collects every plain-language text once, with unique ids', () => {
    const texts = collectTexts(rental);
    const ids = texts.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('summary');
    expect(ids).toContain('point.0.simple');
    expect(ids).toContain('point.0.detailed');
    expect(ids).toContain('scenario.0.node.0');
    expect(texts.every((item) => item.text.trim().length > 0)).toBe(true);
  });

  it('never sends quotes, legal words, names, ids or dates for translation', () => {
    const sent = JSON.stringify(collectTexts(rental));
    for (const point of rental.points) {
      expect(sent).not.toContain(point.quote);
      for (const term of point.terms) expect(sent).not.toContain(`"${term.term}"`);
    }
    expect(sent).not.toContain(rental.parties[0]!.name);
    expect(sent).not.toContain('2026-08-01');
  });

  it('puts translations back by id and keeps everything else identical', () => {
    const translated = collectTexts(rental).map((item) => ({
      id: item.id,
      text: `TE:${item.text}`,
    }));
    const result = applyTexts(rental, translated, 'te');

    expect(result.language).toBe('te');
    expect(result.summary).toBe(`TE:${rental.summary}`);
    expect(result.points[0]!.simple).toBe(`TE:${rental.points[0]!.simple}`);
    // Same clauses, same order, same verified quotes and ids: notes and flags still match.
    expect(result.points.map((point) => [point.id, point.quote, point.verified])).toEqual(
      rental.points.map((point) => [point.id, point.quote, point.verified]),
    );
    expect(result.points[0]!.terms.map((term) => term.term)).toEqual(
      rental.points[0]!.terms.map((term) => term.term),
    );
    expect(result.keyDates.map((date) => date.date)).toEqual(rental.keyDates.map((d) => d.date));
    // The source analysis is not modified.
    expect(rental.summary.startsWith('TE:')).toBe(false);
  });

  it('keeps the original where a translation is missing or empty, and ignores unknown ids', () => {
    const result = applyTexts(
      rental,
      [
        { id: 'summary', text: '   ' },
        { id: 'nothing.here', text: 'ignored' },
      ],
      'hi',
    );
    expect(result.summary).toBe(rental.summary);
    expect(JSON.stringify(result)).not.toContain('ignored');
  });

  it('handles notices (sender stays, claim and demand are translated)', () => {
    const notice = NOTICE_SAMPLE.analyses.en!;
    const ids = collectTexts(notice).map((item) => item.id);
    expect(ids).toEqual(expect.arrayContaining(['notice.claim', 'notice.demand']));
    expect(ids).not.toContain('notice.sender');
  });
});
