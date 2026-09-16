import type { ExplanationLanguage } from '../../shared/languages';

/** Small browser helpers kept in one place so components stay declarative. */

/** SHA-256 hex digest, used as an in-memory cache key (never stored or sent). */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function downloadFile(fileName: string, mimeType: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const SCRIPT_LANGUAGES: readonly [RegExp, ExplanationLanguage][] = [
  [/\p{Script=Devanagari}/gu, 'hi'],
  [/\p{Script=Telugu}/gu, 'te'],
  [/\p{Script=Tamil}/gu, 'ta'],
  [/\p{Script=Kannada}/gu, 'kn'],
  [/\p{Script=Malayalam}/gu, 'ml'],
  [/\p{Script=Bengali}/gu, 'bn'],
  [/\p{Script=Gujarati}/gu, 'gu'],
  [/\p{Script=Gurmukhi}/gu, 'pa'],
  [/\p{Script=Latin}/gu, 'en'],
];

/**
 * Best-effort language of a quote from the original paper, so screen readers and
 * text-to-speech pronounce it correctly. Returns the dominant script's language.
 */
export function detectScriptLanguage(text: string): ExplanationLanguage | undefined {
  let best: ExplanationLanguage | undefined;
  let bestCount = 0;
  for (const [pattern, language] of SCRIPT_LANGUAGES) {
    const count = text.match(pattern)?.length ?? 0;
    if (count > bestCount) {
      best = language;
      bestCount = count;
    }
  }
  return best;
}
