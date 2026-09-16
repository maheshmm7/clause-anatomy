import { describe, expect, it } from 'vitest';
import { passesLuhn, redact } from './redact.js';

describe('redact', () => {
  it('hides Aadhaar numbers in grouped and ungrouped form', () => {
    const result = redact('Aadhaar 2345 6789 0123 and 987654321098.');
    expect(result.text).toBe('Aadhaar [AADHAAR HIDDEN] and [AADHAAR HIDDEN].');
    expect(result.counts.aadhaar).toBe(2);
  });

  it('does not treat Aadhaar-like numbers starting with 0 or 1 as Aadhaar', () => {
    expect(redact('Ref 1234 5678 9012').counts.aadhaar).toBe(0);
  });

  it('hides Indian mobile numbers with and without country code', () => {
    const result = redact('Call +91 98765 43210, 09876543210 or 9876543210 now');
    expect(result.counts.phone).toBe(3);
    expect(result.text).not.toMatch(/\d{5}/);
  });

  it('does not hide amounts or short numbers', () => {
    const text = 'Rent of Rs. 15,000 per month; deposit ₹ 1,50,000; clause 12.3; year 2026.';
    expect(redact(text)).toEqual(expect.objectContaining({ text, total: 0 }));
  });

  it('hides PAN, email and UPI ids', () => {
    const result = redact('PAN ABCDE1234F, mail ravi.k@example.co.in, pay ravi.k@okaxis');
    expect(result.text).toBe('PAN [PAN HIDDEN], mail [EMAIL HIDDEN], pay [UPI ID HIDDEN]');
  });

  it('hides card numbers only when they pass the Luhn check', () => {
    const valid = redact('Card 4111 1111 1111 1111');
    expect(valid.counts.card).toBe(1);
    const invalid = redact('Loan ref 4111 1111 1111 1112');
    expect(invalid.counts.card).toBe(0);
  });

  it('hides bank account numbers but keeps the label for context', () => {
    const result = redact('Pay to A/c No. 123456789012345 at SBI');
    expect(result.text).toBe('Pay to A/c No. [ACCOUNT NUMBER HIDDEN] at SBI');
  });

  it('hides passport and voter id numbers', () => {
    const result = redact('Passport K1234567, EPIC ABC1234567');
    expect(result.counts.passport).toBe(1);
    expect(result.counts.voterId).toBe(1);
  });

  it('handles Devanagari and Telugu digits', () => {
    expect(redact('मोबाइल ९८७६५४३२१०').counts.phone).toBe(1);
    expect(redact('ఫోన్ ౯౮౭౬౫౪౩౨౧౦').counts.phone).toBe(1);
  });

  it('is idempotent', () => {
    const once = redact('Phone 9876543210, PAN ABCDE1234F');
    expect(redact(once.text).text).toBe(once.text);
    expect(redact(once.text).total).toBe(0);
  });

  it('reports the total count', () => {
    expect(redact('9876543210 and ABCDE1234F').total).toBe(2);
  });
});

describe('passesLuhn', () => {
  it('validates known test card numbers', () => {
    expect(passesLuhn('4111111111111111')).toBe(true);
    expect(passesLuhn('4111111111111112')).toBe(false);
  });

  it('rejects numbers outside card length', () => {
    expect(passesLuhn('4242')).toBe(false);
  });
});
