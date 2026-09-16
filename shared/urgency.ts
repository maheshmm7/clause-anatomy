import type { DocumentCategory } from './schema.js';
import { normalizeForMatch } from './text.js';

/**
 * Deterministic urgency safety net.
 *
 * The model also rates urgency, but a person holding an arrest warrant or an
 * eviction notice must never miss the "get help now" message because the model
 * under-rated it. For notices and court papers we scan for strong signals in
 * English, Hindi and Telugu and keep the higher of the two ratings.
 *
 * Agreements and policies are excluded: a rent agreement that merely *mentions*
 * eviction is not an emergency.
 */

export const URGENCY_LEVELS = ['none', 'soon', 'urgent'] as const;
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

const URGENT_TERMS = [
  'arrest',
  'warrant',
  'summons',
  'eviction',
  'evict',
  'vacate the premises',
  'first information report',
  'non-bailable',
  'attachment of property',
  'show cause',
  'गिरफ्तार',
  'वारंट',
  'समन',
  'बेदखल',
  'कारण बताओ',
  'అరెస్ట్',
  'అరెస్టు',
  'వారెంట్',
  'సమన్లు',
  'ఖాళీ చేయ',
];

const SOON_TERMS = ['legal notice', 'hearing', 'कानूनी नोटिस', 'सुनवाई', 'లీగల్ నోటీసు', 'విచారణ'];

/** Short deadlines ("within 15 days", "15 दिनों के भीतर", "15 రోజుల్లో"). */
const DEADLINE_PATTERNS = [
  /within\s+(\d{1,3})\s*(?:\([a-z\s-]+\)\s*)?days/g,
  /(\d{1,3})\s*दिन/g,
  /(\d{1,3})\s*రోజు/g,
];
const SHORT_DEADLINE_DAYS = 30;

const CATEGORIES_WITH_SAFETY_NET: ReadonlySet<DocumentCategory> = new Set([
  'notice',
  'court',
  'other-legal',
]);

/** Matches a term only at a word start, so "evict" does not fire inside another word. */
function containsTerm(haystack: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{M}])${escaped}`, 'u').test(haystack);
}

export interface UrgencySignals {
  level: UrgencyLevel;
  matches: string[];
}

/** Scans text for urgency signals regardless of document category. */
export function detectUrgencySignals(text: string): UrgencySignals {
  const haystack = normalizeForMatch(text);
  const urgent = URGENT_TERMS.filter((term) => containsTerm(haystack, term));
  if (urgent.length > 0) return { level: 'urgent', matches: urgent };

  const soon = SOON_TERMS.filter((term) => containsTerm(haystack, term));
  for (const pattern of DEADLINE_PATTERNS) {
    for (const match of haystack.matchAll(pattern)) {
      const days = Number(match[1]);
      if (days > 0 && days <= SHORT_DEADLINE_DAYS) soon.push(match[0]);
    }
  }
  return soon.length > 0 ? { level: 'soon', matches: soon } : { level: 'none', matches: [] };
}

export function maxUrgency(a: UrgencyLevel, b: UrgencyLevel): UrgencyLevel {
  return URGENCY_LEVELS.indexOf(a) >= URGENCY_LEVELS.indexOf(b) ? a : b;
}

/** Final urgency: the model's rating, raised by the safety net for notices and court papers. */
export function resolveUrgency(
  modelLevel: UrgencyLevel,
  category: DocumentCategory,
  text: string,
): UrgencyLevel {
  if (!CATEGORIES_WITH_SAFETY_NET.has(category)) return modelLevel;
  return maxUrgency(modelLevel, detectUrgencySignals(text).level);
}
