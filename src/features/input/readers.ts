import { LIMITS, type UploadMimeType } from '../../../shared/limits';
import type { MessageKey } from '../../i18n/messages/en';

/**
 * Turns whatever the user picked into text we can analyse, doing as much as possible
 * on the device:
 *  - .txt → read directly
 *  - digital PDF → text extracted locally with pdf.js (lazy-loaded only when needed)
 *  - photo / scanned PDF → compressed on the device, then needs consent + AI transcription
 */

export type ReadResult =
  | { kind: 'text'; text: string }
  | {
      kind: 'visual';
      mimeType: UploadMimeType;
      data: string;
      previewUrl: string | null;
      fileName: string;
    };

export class ReadError extends Error {
  readonly messageKey: MessageKey;

  constructor(messageKey: MessageKey) {
    super(messageKey);
    this.name = 'ReadError';
    this.messageKey = messageKey;
  }
}

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

interface PdfTextItem {
  str?: string;
  hasEOL?: boolean;
}

/** Joins pdf.js text items into readable lines. */
export function pdfItemsToText(items: readonly PdfTextItem[]): string {
  return items
    .map((item) => `${item.str ?? ''}${item.hasEOL ? '\n' : ''}`)
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

async function readPdfText(bytes: Uint8Array): Promise<string> {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  // pdf.js takes ownership of the buffer, so give it a copy.
  const loadingTask = pdfjs.getDocument({ data: bytes.slice(), stopAtErrors: false });
  try {
    const document = await loadingTask.promise;
    const pages: string[] = [];
    const pageCount = Math.min(document.numPages, LIMITS.maxPdfPages);
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(pdfItemsToText(content.items as PdfTextItem[]));
    }
    return pages.join('\n\n').trim();
  } finally {
    await loadingTask.destroy();
  }
}

async function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('encode failed'))),
      'image/jpeg',
      quality,
    );
  });
}

/** Downscales and re-encodes a photo as JPEG so it uploads fast on slow mobile networks. */
async function compressImage(file: File): Promise<Uint8Array<ArrayBuffer>> {
  const bitmap = await createImageBitmap(file);
  try {
    for (const [maxEdge, quality] of [
      [LIMITS.maxImageEdgePx, 0.85],
      [1400, 0.75],
      [1100, 0.65],
    ] as const) {
      const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const bytes = new Uint8Array(await (await canvasToJpeg(canvas, quality)).arrayBuffer());
      if (Math.ceil(bytes.length / 3) * 4 <= LIMITS.maxUploadBase64Chars) return bytes;
    }
  } finally {
    bitmap.close();
  }
  throw new ReadError('error_fileTooLarge');
}

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function isText(file: File): boolean {
  return file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');
}

export async function readDocumentFile(file: File): Promise<ReadResult> {
  if (file.size > LIMITS.maxRawFileBytes) throw new ReadError('error_fileTooLarge');

  if (isText(file)) return { kind: 'text', text: await file.text() };

  if (isPdf(file)) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let text: string;
    try {
      text = await readPdfText(bytes);
    } catch {
      throw new ReadError('error_pdfFailed');
    }
    if (text.length >= LIMITS.minDocumentChars) return { kind: 'text', text };

    // No text layer: a scanned PDF. Send it for transcription (after consent).
    const data = bytesToBase64(bytes);
    if (data.length > LIMITS.maxUploadBase64Chars) throw new ReadError('error_fileTooLarge');
    return {
      kind: 'visual',
      mimeType: 'application/pdf',
      data,
      previewUrl: null,
      fileName: file.name,
    };
  }

  if (IMAGE_TYPES.has(file.type) || file.type.startsWith('image/')) {
    let bytes: Uint8Array<ArrayBuffer>;
    try {
      bytes = await compressImage(file);
    } catch (error) {
      throw error instanceof ReadError ? error : new ReadError('error_imageFailed');
    }
    const previewUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
    return {
      kind: 'visual',
      mimeType: 'image/jpeg',
      data: bytesToBase64(bytes),
      previewUrl,
      fileName: file.name,
    };
  }

  throw new ReadError('error_unsupported_file');
}
