import { describe, expect, it } from 'vitest';
import { isQuoteGrounded, locateQuote, prepareSource } from './verifyQuote.js';
import { normalizeWithOffsets, tokenize } from './text.js';

const SOURCE = `9. SUBLETTING
The Lessee shall not sublet, assign or part with the possession of the
Premises without the prior written consent of the Lessor, failing which
the security deposit shall stand forfeited.

10. NOTICE
Either party may terminate this agreement by giving “two months’ notice” in writing.`;

describe('locateQuote', () => {
  const prepared = prepareSource(SOURCE);

  it('finds exact quotes despite different line breaks and case', () => {
    const quote = 'THE LESSEE SHALL NOT SUBLET, assign or part with the possession of the Premises';
    const range = locateQuote(prepared, quote);
    expect(range).not.toBeNull();
    expect(SOURCE.slice(range!.start, range!.end)).toContain('possession of the\nPremises');
  });

  it('treats curly and straight quotes as equal', () => {
    expect(isQuoteGrounded(prepared, 'by giving "two months\' notice" in writing')).toBe(true);
  });

  it('accepts ellipsis quotes whose segments appear in order', () => {
    expect(
      isQuoteGrounded(
        prepared,
        'The Lessee shall not sublet … the security deposit shall stand forfeited',
      ),
    ).toBe(true);
  });

  it('rejects ellipsis quotes whose segments are out of order', () => {
    expect(
      isQuoteGrounded(
        prepared,
        'the security deposit shall stand forfeited ... The Lessee shall not sublet',
      ),
    ).toBe(false);
  });

  it('tolerates one missing word in a long quote', () => {
    expect(
      isQuoteGrounded(
        prepared,
        'without the prior written consent of Lessor, failing which the security deposit shall stand forfeited',
      ),
    ).toBe(true);
  });

  it('rejects paraphrases and fabricated text', () => {
    expect(
      isQuoteGrounded(prepared, 'The tenant can sublet the flat if they inform the owner'),
    ).toBe(false);
    expect(isQuoteGrounded(prepared, 'The Lessor shall refund the deposit with 12% interest')).toBe(
      false,
    );
  });

  it('rejects quotes that are too short to prove anything', () => {
    expect(isQuoteGrounded(prepared, 'Lessee')).toBe(false);
    expect(isQuoteGrounded(prepared, '"..."')).toBe(false);
  });

  it('works for non-Latin scripts', () => {
    const hindi = prepareSource(
      'किरायेदार मकान मालिक की लिखित अनुमति के बिना कमरा किसी और को नहीं देगा।',
    );
    expect(isQuoteGrounded(hindi, 'मकान मालिक की लिखित अनुमति के बिना')).toBe(true);
  });

  it('checks a long document quickly', () => {
    const big = prepareSource(
      `${'Lorem ipsum dolor sit amet consectetur. '.repeat(1500)}${SOURCE}`,
    );
    const started = performance.now();
    for (let i = 0; i < 15; i += 1) {
      isQuoteGrounded(big, 'The Lessor shall refund the entire deposit with interest immediately');
    }
    expect(performance.now() - started).toBeLessThan(1500);
  });
});

describe('text normalisation', () => {
  it('collapses whitespace and keeps offsets pointing into the original', () => {
    const { value, offsets } = normalizeWithOffsets('  A\n\n  B\u200Bc ');
    expect(value).toBe('a bc');
    expect(offsets).toEqual([2, 7, 7, 9]);
  });

  it('tokenizes letters and digits across scripts', () => {
    expect(tokenize('clause 9: किराया, ఇల్లు!').map((t) => t.token)).toEqual([
      'clause',
      '9',
      'किराया',
      'ఇల్లు',
    ]);
  });
});
