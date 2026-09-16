/**
 * Privacy redaction for Indian personal identifiers.
 *
 * Runs in the browser before any text leaves the device, and again on the server
 * as defence in depth before text is sent to the AI model. Redaction is pattern
 * based, so it hides structured identifiers (Aadhaar, PAN, phone, email, cards,
 * bank accounts, passport, voter ID) but cannot reliably detect personal names.
 */

export const REDACTION_KINDS = [
  'email',
  'upi',
  'card',
  'aadhaar',
  'phone',
  'pan',
  'account',
  'passport',
  'voterId',
] as const;
export type RedactionKind = (typeof REDACTION_KINDS)[number];

export interface RedactionResult {
  text: string;
  counts: Record<RedactionKind, number>;
  total: number;
}

/** ASCII, Devanagari and Telugu digits — Indian documents may use any of them. */
const D = '[0-9\u0966-\u096F\u0C66-\u0C6F]';
const MOBILE_LEAD = '[6-9\u096C-\u096F\u0C6C-\u0C6F]';
const SEP = '[\\s-]?';
const NOT_DIGIT_BEFORE = `(?<!${D})`;
const NOT_DIGIT_AFTER = `(?!${D})`;
const NOT_WORD_BEFORE = '(?<![A-Za-z0-9])';
const NOT_WORD_AFTER = '(?![A-Za-z0-9])';

const DIGIT_VALUE_OFFSETS = [0x30, 0x966, 0xc66];

function digitValue(char: string): number {
  const code = char.charCodeAt(0);
  for (const base of DIGIT_VALUE_OFFSETS) {
    if (code >= base && code <= base + 9) return code - base;
  }
  return -1;
}

/** Luhn checksum — keeps random long numbers (e.g. loan amounts, reference ids) from being hidden as cards. */
export function passesLuhn(candidate: string): boolean {
  const digits = [...candidate].map(digitValue).filter((value) => value >= 0);
  if (digits.length < 13 || digits.length > 19) return false;
  const sum = digits.reverse().reduce((total, digit, index) => {
    if (index % 2 === 0) return total + digit;
    const doubled = digit * 2;
    return total + (doubled > 9 ? doubled - 9 : doubled);
  }, 0);
  return sum % 10 === 0;
}

interface Redactor {
  kind: RedactionKind;
  label: string;
  pattern: RegExp;
  /** Optional extra check on the full match. */
  accept?: (match: string) => boolean;
  /** When set, only this capture group is replaced (keeps context words like "A/c No."). */
  group?: number;
}

const REDACTORS: readonly Redactor[] = [
  {
    kind: 'email',
    label: '[EMAIL HIDDEN]',
    pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g,
  },
  {
    kind: 'upi',
    label: '[UPI ID HIDDEN]',
    pattern: /(?<![A-Za-z0-9._-])[A-Za-z0-9._-]{2,}@[A-Za-z]{2,}(?![A-Za-z0-9.@])/g,
  },
  {
    kind: 'card',
    label: '[CARD NUMBER HIDDEN]',
    pattern: new RegExp(`${NOT_DIGIT_BEFORE}${D}(?:[\\s-]?${D}){12,18}${NOT_DIGIT_AFTER}`, 'g'),
    accept: passesLuhn,
  },
  {
    kind: 'aadhaar',
    label: '[AADHAAR HIDDEN]',
    pattern: new RegExp(
      `${NOT_DIGIT_BEFORE}[2-9\u0968-\u096F\u0C68-\u0C6F]${D}{3}${SEP}${D}{4}${SEP}${D}{4}${NOT_DIGIT_AFTER}`,
      'g',
    ),
  },
  {
    kind: 'phone',
    label: '[PHONE HIDDEN]',
    pattern: new RegExp(
      `${NOT_DIGIT_BEFORE}(?:\\+91[\\s-]?|0)?${MOBILE_LEAD}${D}{4}${SEP}${D}{5}${NOT_DIGIT_AFTER}`,
      'g',
    ),
  },
  {
    kind: 'pan',
    label: '[PAN HIDDEN]',
    pattern: new RegExp(`${NOT_WORD_BEFORE}[A-Z]{5}[0-9]{4}[A-Z]${NOT_WORD_AFTER}`, 'g'),
  },
  {
    kind: 'account',
    label: '[ACCOUNT NUMBER HIDDEN]',
    pattern: new RegExp(
      `((?:a\\/c|acct|account)(?:\\s*(?:no\\.?|number|#))?\\s*[:.\\-]?\\s*)(${D}(?:[\\s-]?${D}){7,17})${NOT_DIGIT_AFTER}`,
      'gi',
    ),
    group: 2,
  },
  {
    kind: 'passport',
    label: '[PASSPORT HIDDEN]',
    pattern: new RegExp(`${NOT_WORD_BEFORE}[A-PR-WY][1-9][0-9]{5}[1-9]${NOT_WORD_AFTER}`, 'g'),
  },
  {
    kind: 'voterId',
    label: '[VOTER ID HIDDEN]',
    pattern: new RegExp(`${NOT_WORD_BEFORE}[A-Z]{3}[0-9]{7}${NOT_WORD_AFTER}`, 'g'),
  },
];

function emptyCounts(): Record<RedactionKind, number> {
  return Object.fromEntries(REDACTION_KINDS.map((kind) => [kind, 0])) as Record<
    RedactionKind,
    number
  >;
}

/** Hides personal identifiers in `input`. Pure and idempotent. */
export function redact(input: string): RedactionResult {
  const counts = emptyCounts();
  let text = input;

  for (const redactor of REDACTORS) {
    text = text.replace(redactor.pattern, (match: string, ...rest: unknown[]) => {
      if (redactor.accept && !redactor.accept(match)) return match;
      counts[redactor.kind] += 1;
      if (redactor.group === undefined) return redactor.label;
      const prefix = typeof rest[0] === 'string' ? rest[0] : '';
      return `${prefix}${redactor.label}`;
    });
  }

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return { text, counts, total };
}
