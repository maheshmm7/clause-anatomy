import { describe, expect, it } from 'vitest';
import { LIMITS } from '../../../shared/limits';
import { ReadError, bytesToBase64, pdfItemsToText, readDocumentFile } from './readers';

describe('bytesToBase64', () => {
  it('encodes bytes, including large inputs processed in chunks', () => {
    expect(bytesToBase64(new TextEncoder().encode('hello'))).toBe('aGVsbG8=');
    const large = new Uint8Array(100_000).fill(65);
    expect(atob(bytesToBase64(large))).toHaveLength(100_000);
  });
});

describe('pdfItemsToText', () => {
  it('joins text items and respects line ends', () => {
    expect(
      pdfItemsToText([
        { str: '1. RENT:', hasEOL: false },
        { str: ' Pay Rs. 22,000  ', hasEOL: true },
        { str: '2. DEPOSIT' },
        {},
      ]),
    ).toBe('1. RENT: Pay Rs. 22,000\n2. DEPOSIT');
  });
});

describe('readDocumentFile', () => {
  it('reads plain text files directly', async () => {
    const file = new File(['RENT AGREEMENT text'], 'agreement.txt', { type: 'text/plain' });
    expect(await readDocumentFile(file)).toEqual({ kind: 'text', text: 'RENT AGREEMENT text' });
  });

  it('rejects files that are too large before reading them', async () => {
    const file = new File(['x'], 'big.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: LIMITS.maxRawFileBytes + 1 });
    await expect(readDocumentFile(file)).rejects.toMatchObject({
      messageKey: 'error_fileTooLarge',
    });
  });

  it('rejects unsupported file types', async () => {
    const file = new File(['<html>'], 'page.html', { type: 'text/html' });
    const error = await readDocumentFile(file).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ReadError);
    expect((error as ReadError).messageKey).toBe('error_unsupported_file');
  });

  it('reports unreadable PDFs with a friendly message', async () => {
    const file = new File(['not really a pdf'], 'broken.pdf', { type: 'application/pdf' });
    await expect(readDocumentFile(file)).rejects.toMatchObject({ messageKey: 'error_pdfFailed' });
  });
});
