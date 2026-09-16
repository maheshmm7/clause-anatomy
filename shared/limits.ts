/**
 * Input limits shared by client-side validation and server-side enforcement.
 * Keeping them in one place guarantees the UI never promises more than the API accepts.
 */
export const LIMITS = {
  /** Shortest text worth analysing (a single short clause). */
  minDocumentChars: 40,
  /** Roughly 25 pages of typical agreement text. */
  maxDocumentChars: 60_000,
  minQuestionChars: 3,
  maxQuestionChars: 500,
  /**
   * Base64 payload cap for photos / scanned PDFs. Stays below the 4.5 MB request
   * limit of common serverless hosts (e.g. Vercel) after JSON overhead.
   */
  maxUploadBase64Chars: 4_000_000,
  /** Raw file size accepted by the picker before compression (images) or reading (PDF). */
  maxRawFileBytes: 15 * 1024 * 1024,
  /** Longest image edge after client-side compression. */
  maxImageEdgePx: 1800,
  /** Pages read from a digital PDF. */
  maxPdfPages: 40,
  /** Minimum characters of the source a quote must contain to count as verifiable. */
  minVerifiableQuoteChars: 15,
} as const;

export const UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;
export type UploadMimeType = (typeof UPLOAD_MIME_TYPES)[number];
