import type { UploadMimeType } from '../../shared/limits.js';

/**
 * Detects a file type from its leading "magic bytes" instead of trusting the
 * client-declared MIME type, so a renamed executable or HTML file is rejected.
 */

interface Signature {
  mimeType: UploadMimeType;
  matches: (bytes: Uint8Array) => boolean;
}

const startsWith = (bytes: Uint8Array, prefix: readonly number[], offset = 0): boolean =>
  prefix.every((value, index) => bytes[offset + index] === value);

const SIGNATURES: readonly Signature[] = [
  { mimeType: 'image/jpeg', matches: (b) => startsWith(b, [0xff, 0xd8, 0xff]) },
  {
    mimeType: 'image/png',
    matches: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    // "RIFF" .... "WEBP"
    mimeType: 'image/webp',
    matches: (b) =>
      startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8),
  },
  { mimeType: 'application/pdf', matches: (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46, 0x2d]) },
];

/** Returns the detected type of base64 `data`, or `null` when it is not an accepted format. */
export function detectMimeType(base64: string): UploadMimeType | null {
  // 16 base64 chars decode to 12 bytes — enough for every signature above.
  const head = Buffer.from(base64.slice(0, 16), 'base64');
  const bytes = new Uint8Array(head);
  return SIGNATURES.find((signature) => signature.matches(bytes))?.mimeType ?? null;
}
