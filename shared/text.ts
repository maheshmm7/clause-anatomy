/**
 * Text normalisation used to compare model quotes with the source document.
 *
 * Models often change harmless details when quoting (curly vs straight quotes,
 * line breaks, letter case, Unicode forms). We normalise both sides the same way
 * and keep a map back to the original offsets so a quote can be highlighted in
 * the untouched source text.
 */

const QUOTE_CHARS = /[\u2018\u2019\u201A\u201B\u2032`\u00B4]/g;
const DOUBLE_QUOTE_CHARS = /[\u201C\u201D\u201E\u201F\u2033\u00AB\u00BB]/g;
const DASH_CHARS = /[\u2010-\u2015\u2212]/g;
const INVISIBLE_CHARS = /\u200B|\u200C|\u200D|\u2060|\uFEFF|\u00AD/;

function normalizeChunk(chunk: string): string {
  return chunk
    .normalize('NFKC')
    .toLowerCase()
    .replace(QUOTE_CHARS, "'")
    .replace(DOUBLE_QUOTE_CHARS, '"')
    .replace(DASH_CHARS, '-');
}

export interface NormalizedText {
  /** Normalised text: lower-case, unified punctuation, single spaces. */
  value: string;
  /** `offsets[i]` is the index in the original string that produced `value[i]`. */
  offsets: number[];
}

/**
 * Normalises `text` while recording, for every output character, the original index.
 * Runs in O(n).
 */
export function normalizeWithOffsets(text: string): NormalizedText {
  let value = '';
  const offsets: number[] = [];
  let pendingSpace = false;

  for (let index = 0; index < text.length;) {
    const codePoint = text.codePointAt(index) ?? 0;
    const char = String.fromCodePoint(codePoint);
    const width = char.length;

    if (INVISIBLE_CHARS.test(char)) {
      index += width;
      continue;
    }

    if (/\s/u.test(char)) {
      pendingSpace = value.length > 0;
      index += width;
      continue;
    }

    if (pendingSpace) {
      value += ' ';
      offsets.push(index);
      pendingSpace = false;
    }

    const normalized = normalizeChunk(char);
    for (let i = 0; i < normalized.length; i += 1) {
      value += normalized[i];
      offsets.push(index);
    }
    index += width;
  }

  return { value, offsets };
}

export function normalizeForMatch(text: string): string {
  return normalizeWithOffsets(text).value;
}

/** Splits normalised text into word tokens with their start/end positions. */
export function tokenize(normalized: string): { token: string; start: number; end: number }[] {
  const tokens: { token: string; start: number; end: number }[] = [];
  const pattern = /[\p{L}\p{M}\p{N}]+/gu;
  for (const match of normalized.matchAll(pattern)) {
    tokens.push({ token: match[0], start: match.index, end: match.index + match[0].length });
  }
  return tokens;
}
