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
  /** Translating an explanation: how many texts, and how long each and all together. */
  maxTranslateItems: 600,
  maxTranslateItemChars: 1_500,
  maxTranslateTotalChars: 60_000,
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

/**
 * A reader may use their own Gemini API key. It is sent in this header on each AI
 * request, used for that request only, and never stored or logged by the server.
 */
export const USER_KEY_HEADER = 'x-gemini-api-key';

/** The characters and length of a Gemini API key (checked before it is ever used). */
export const GEMINI_KEY_PATTERN = /^[A-Za-z0-9._-]{30,120}$/;
