import { describe, expect, it } from 'vitest';
import type { VerifiedPoint } from '../../shared/schema';
import { formatIsoDate, formatMessage, MESSAGES } from '../i18n/format';
import { RENTAL_SAMPLE } from '../samples/rental';
import { buildBriefText, collectLawyerQuestions } from './brief';
import { detectScriptLanguage, sha256Hex } from './browser';
import { buildIcs, escapeIcsText, foldLine } from './ics';
import { groupDuties, isGoodForReader, needsAttention, partyLabel } from './perspective';

const analysis = RENTAL_SAMPLE.analyses.en!;
const point = (id: string): VerifiedPoint =>
  analysis.points.find((candidate) => candidate.id === id)!;
const t = (key: Parameters<typeof formatMessage>[1], values?: Record<string, string | number>) =>
  formatMessage('en', key, values);

describe('perspective', () => {
  it('labels parties by role and falls back to a readable id', () => {
    expect(partyLabel(analysis.parties, 'lessor')).toBe('Landlord');
    expect(partyLabel(analysis.parties, 'guarantor')).toBe('Guarantor');
  });

  it('flags points that bind the reader or favour the other side', () => {
    expect(needsAttention(point('p4'), 'lessee')).toBe(true); // tenant must not sublet
    expect(needsAttention(point('p4'), 'lessor')).toBe(false); // good for landlord
    expect(needsAttention(point('p10'), 'lessee')).toBe(false); // low importance
    expect(needsAttention(point('p6'), null)).toBe(false); // medium, just reading
    expect(needsAttention(point('p1'), null)).toBe(true); // high, just reading
  });

  it('knows what is good for the reader', () => {
    expect(isGoodForReader(point('p4'), 'lessor')).toBe(true);
    expect(isGoodForReader(point('p4'), null)).toBe(false);
  });

  it('groups duties into a personal checklist', () => {
    const groups = groupDuties(analysis.points, 'lessee');
    expect(groups.youMust.map((item) => item.pointId)).toEqual(['p1', 'p8', 'p9']);
    expect(groups.youMustNot.map((item) => item.pointId)).toEqual(['p2', 'p4']);
    expect(groups.youMay.map((item) => item.pointId)).toEqual(['p5']);
    expect(groups.othersMust.map((item) => item.pointId)).toEqual(['p3', 'p8']);
    expect(groupDuties(analysis.points, null).youMust).toEqual([]);
  });
});

describe('ics', () => {
  it('escapes special characters', () => {
    expect(escapeIcsText('Rent, deposit; notice\\note\nline')).toBe(
      'Rent\\, deposit\\; notice\\\\note\\nline',
    );
  });

  it('folds long lines without splitting multi-byte characters', () => {
    const folded = foldLine(`SUMMARY:${'అ'.repeat(40)}`);
    for (const line of folded.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(folded.replace(/\r\n /g, '')).toBe(`SUMMARY:${'అ'.repeat(40)}`);
  });

  it('builds all-day events with a reminder', () => {
    const ics = buildIcs(
      [{ date: '2027-06-30', summary: 'Agreement ends' }],
      new Date('2026-09-17T10:00:00Z'),
    );
    expect(ics).toContain('BEGIN:VCALENDAR\r\n');
    expect(ics).toContain('DTSTART;VALUE=DATE:20270630');
    expect(ics).toContain('DTEND;VALUE=DATE:20270701');
    expect(ics).toContain('DTSTAMP:20260917T100000Z');
    expect(ics).toContain('TRIGGER:-P1D');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });
});

describe('lawyer brief', () => {
  const input = {
    analysis,
    checks: { p1: 'correct', p4: 'unsure', p5: 'wrong' } as const,
    asked: [
      { question: 'Can I keep a pet?', basis: 'general' as const },
      { question: 'What is the rent?', basis: 'document' as const },
    ],
  };

  it('collects suggested, not-understood and unanswered questions without duplicates', () => {
    const questions = collectLawyerQuestions(input, t);
    expect(questions).toContain(analysis.lawyerQuestions[0]);
    expect(questions).toContain(
      'I did not understand "Renting the flat to someone else". What does it mean for me?',
    );
    expect(questions).toContain(
      'I did not understand "Ending the agreement with notice". What does it mean for me?',
    );
    expect(questions).toContain('Can I keep a pet?');
    expect(questions).not.toContain('What is the rent?');
    expect(new Set(questions).size).toBe(questions.length);
  });

  it('builds a shareable plain-text brief', () => {
    const text = buildBriefText(input, t, (date) => formatIsoDate('en', date));
    expect(text.startsWith('My legal paper: Rent agreement (renting a flat)')).toBe(true);
    expect(text).toContain('Important dates:\n- 1 August 2026: Rent agreement starts');
    expect(text).toContain('My questions:\n1. ');
    expect(text.endsWith('This is not legal advice.')).toBe(true);
  });
});

describe('browser helpers', () => {
  it('detects the dominant script of a text', () => {
    expect(detectScriptLanguage('The Lessee shall pay')).toBe('en');
    expect(detectScriptLanguage('किरायेदार हर महीने')).toBe('hi');
    expect(detectScriptLanguage('అద్దెదారు Rs. 22,000')).toBe('te');
    expect(detectScriptLanguage('12345')).toBeUndefined();
  });

  it('hashes text with SHA-256', async () => {
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('i18n', () => {
  const placeholders = (text: string): string[] =>
    [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!).sort();

  it('translates every key into every UI language with the same placeholders', () => {
    const keys = Object.keys(MESSAGES.en) as (keyof typeof MESSAGES.en)[];
    for (const language of ['hi', 'te'] as const) {
      expect(Object.keys(MESSAGES[language]).sort()).toEqual([...keys].sort());
      for (const key of keys) {
        expect(MESSAGES[language][key].trim().length, `${language}.${key}`).toBeGreaterThan(0);
        expect(placeholders(MESSAGES[language][key]), `${language}.${key}`).toEqual(
          placeholders(MESSAGES.en[key]),
        );
      }
    }
  });

  it('fills placeholders and leaves unknown ones visible', () => {
    expect(formatMessage('en', 'pointOf', { current: 2, total: 9 })).toBe('Point 2 of 9');
    expect(formatMessage('en', 'pointOf', { current: 2 })).toBe('Point 2 of {total}');
  });

  it('formats dates for each language without timezone shifts', () => {
    expect(formatIsoDate('en', '2026-09-26')).toBe('26 September 2026');
    expect(formatIsoDate('hi', '2026-09-26')).toContain('2026');
    expect(formatIsoDate('en', 'not-a-date')).toBe('not-a-date');
  });
});
