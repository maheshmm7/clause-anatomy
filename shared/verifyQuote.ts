import { LIMITS } from './limits.js';
import { normalizeWithOffsets, tokenize, type NormalizedText } from './text.js';

/**
 * Grounding check: does a quote produced by the model really exist in the document?
 *
 * Strategy (cheapest first):
 *  1. Exact match after normalisation (case, whitespace, punctuation variants).
 *  2. Ellipsis quotes ("A … B"): every segment must appear, in order.
 *  3. Near-exact match: a window of source words containing ≥ 90% of the quote's
 *     words (tolerates a dropped comma-word or OCR slip, but not a paraphrase).
 */

const FUZZY_THRESHOLD = 0.9;
const ELLIPSIS = /\.{3}|\u2026/;
const WRAPPING_QUOTES = /^["'\s]+|["'\s]+$/g;

export interface QuoteRange {
  start: number;
  end: number;
}

export interface PreparedSource {
  normalized: NormalizedText;
  tokens: ReturnType<typeof tokenize>;
}

/** Pre-computes normalisation for a document so many quotes can be checked cheaply. */
export function prepareSource(source: string): PreparedSource {
  const normalized = normalizeWithOffsets(source);
  return { normalized, tokens: tokenize(normalized.value) };
}

function cleanQuote(quote: string): string {
  return normalizeWithOffsets(quote).value.replace(WRAPPING_QUOTES, '');
}

function toOriginalRange(prepared: PreparedSource, start: number, end: number): QuoteRange {
  const { offsets } = prepared.normalized;
  const originalStart = offsets[start] ?? 0;
  const lastIndex = offsets[Math.max(start, end - 1)] ?? originalStart;
  return { start: originalStart, end: lastIndex + 1 };
}

function findExact(prepared: PreparedSource, needle: string, from = 0): [number, number] | null {
  const index = prepared.normalized.value.indexOf(needle, from);
  return index === -1 ? null : [index, index + needle.length];
}

function findWithEllipsis(prepared: PreparedSource, quote: string): [number, number] | null {
  const segments = quote
    .split(ELLIPSIS)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  if (segments.length < 2) return null;

  let cursor = 0;
  let first: number | null = null;
  let last = 0;
  for (const segment of segments) {
    const found = findExact(prepared, segment, cursor);
    if (!found) return null;
    first ??= found[0];
    [, last] = found;
    cursor = found[1];
  }
  return first === null ? null : [first, last];
}

/**
 * Sliding window over source tokens, maintaining overlap counts incrementally: O(n + m).
 */
function findFuzzy(prepared: PreparedSource, quote: string): [number, number] | null {
  const quoteTokens = tokenize(quote).map((t) => t.token);
  const size = quoteTokens.length;
  const { tokens } = prepared;
  if (size < 3 || tokens.length < size) return null;

  const needed = new Map<string, number>();
  for (const token of quoteTokens) needed.set(token, (needed.get(token) ?? 0) + 1);

  const windowCounts = new Map<string, number>();
  let overlap = 0;
  const required = Math.ceil(size * FUZZY_THRESHOLD);

  const add = (token: string): void => {
    const count = (windowCounts.get(token) ?? 0) + 1;
    windowCounts.set(token, count);
    if (count <= (needed.get(token) ?? 0)) overlap += 1;
  };
  const remove = (token: string): void => {
    const count = windowCounts.get(token) ?? 0;
    if (count <= (needed.get(token) ?? 0)) overlap -= 1;
    windowCounts.set(token, count - 1);
  };

  for (const [index, current] of tokens.entries()) {
    add(current.token);
    const leaving = tokens[index - size];
    if (leaving) remove(leaving.token);
    const first = tokens[index - size + 1];
    if (first && overlap >= required) return [first.start, current.end];
  }
  return null;
}

/** Returns where the quote sits in the original source text, or `null` if it is not grounded. */
export function locateQuote(prepared: PreparedSource, quote: string): QuoteRange | null {
  const needle = cleanQuote(quote);
  const visibleLength = needle.replace(ELLIPSIS, '').replace(/\s/g, '').length;
  if (visibleLength < LIMITS.minVerifiableQuoteChars) return null;

  const match =
    findExact(prepared, needle) ??
    findWithEllipsis(prepared, needle) ??
    findFuzzy(prepared, needle);
  return match ? toOriginalRange(prepared, match[0], match[1]) : null;
}

export function isQuoteGrounded(prepared: PreparedSource, quote: string): boolean {
  return locateQuote(prepared, quote) !== null;
}
