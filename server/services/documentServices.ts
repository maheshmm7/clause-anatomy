import { LIMITS } from '../../shared/limits.js';
import { redact } from '../../shared/redact.js';
import {
  analysisSchema,
  answerSchema,
  extractionSchema,
  translationSchema,
  type AnalysisResult,
  type AnalyzeRequest,
  type AnswerResult,
  type AskRequest,
  type ExtractRequest,
  type ExtractResult,
  type TranslateRequest,
  type TranslateResult,
} from '../../shared/schema.js';
import { isQuoteGrounded, prepareSource } from '../../shared/verifyQuote.js';
import {
  EXTRACTION_INSTRUCTION,
  analysisInstruction,
  analysisParts,
  answerInstruction,
  answerParts,
  extractionParts,
  translationInstruction,
  translationParts,
} from '../ai/prompts.js';
import type { AiClient } from '../ai/types.js';
import { detectMimeType } from '../lib/fileSignature.js';
import { HttpError } from '../lib/httpError.js';
import { clip, postprocessAnalysis } from './postprocess.js';

/** Temperatures are low: these tasks reward faithfulness, not creativity. */
const TEMPERATURE = { analyze: 0.2, answer: 0.1, extract: 0, translate: 0.1 } as const;

/**
 * Texts per translation call: a full explanation (~130 texts) becomes 2 parallel calls —
 * about twice as fast as one long reply, without tripping free-tier per-minute limits.
 */
const TRANSLATE_CHUNK_SIZE = 70;

export interface DocumentServices {
  analyze(request: AnalyzeRequest): Promise<AnalysisResult>;
  answer(request: AskRequest): Promise<AnswerResult>;
  extract(request: ExtractRequest): Promise<ExtractResult>;
  translate(request: TranslateRequest): Promise<TranslateResult>;
}

export interface DocumentServicesOptions {
  ai: AiClient;
  /** Injectable clock so prompts are deterministic in tests. */
  now?: () => Date;
}

export function createDocumentServices({
  ai,
  now = () => new Date(),
}: DocumentServicesOptions): DocumentServices {
  return {
    async analyze({ text, language }) {
      // Defence in depth: the browser already redacts, but never rely on the client.
      const safeText = redact(text).text;
      const today = now().toISOString().slice(0, 10);
      const analysis = await ai.generateJson({
        task: 'analyze',
        systemInstruction: analysisInstruction(language),
        parts: analysisParts(safeText, today),
        schema: analysisSchema,
        temperature: TEMPERATURE.analyze,
      });
      return postprocessAnalysis(analysis, safeText, language);
    },

    async answer({ text, question, language }) {
      const safeText = redact(text).text;
      const safeQuestion = redact(question).text;
      const reply = await ai.generateJson({
        task: 'answer',
        systemInstruction: answerInstruction(language),
        parts: answerParts(safeText, safeQuestion),
        schema: answerSchema,
        temperature: TEMPERATURE.answer,
      });

      const prepared = prepareSource(safeText);
      const quotes = reply.quotes
        .map((quote) => clip(quote, 600))
        .filter((quote) => quote.length > 0)
        .map((quote) => ({ text: quote, verified: isQuoteGrounded(prepared, quote) }));

      // A "from your document" answer with no verifiable quote is not grounded.
      const basis =
        reply.basis === 'document' && !quotes.some((quote) => quote.verified)
          ? 'general'
          : reply.basis;
      return { basis, answer: clip(reply.answer, 1200), quotes };
    },

    async translate({ items, language }) {
      // Explanations never contain private numbers, but redact again: never trust the client.
      const safeItems = items.map((item) => ({ id: item.id, text: redact(item.text).text }));
      // The texts are independent, so a long explanation is translated in a few parallel
      // chunks: much faster than one long reply, and still one request for the browser.
      const chunks: (typeof safeItems)[] = [];
      for (let start = 0; start < safeItems.length; start += TRANSLATE_CHUNK_SIZE) {
        chunks.push(safeItems.slice(start, start + TRANSLATE_CHUNK_SIZE));
      }
      const replies = await Promise.all(
        chunks.map((chunk) =>
          ai.generateJson({
            task: 'translate',
            systemInstruction: translationInstruction(language),
            parts: translationParts(chunk),
            schema: translationSchema,
            temperature: TEMPERATURE.translate,
          }),
        ),
      );
      // Map back by id; anything missing or empty keeps its original text, so the result
      // always has exactly the requested ids and nothing else.
      const translated = new Map(
        replies.flatMap((reply) => reply.items).map((item) => [item.id, item.text]),
      );
      return {
        items: safeItems.map((item) => {
          const text = clip(translated.get(item.id) ?? '', LIMITS.maxTranslateItemChars);
          return { id: item.id, text: text.length > 0 ? text : item.text };
        }),
      };
    },

    async extract({ mimeType, data }) {
      const detected = detectMimeType(data);
      if (detected === null || detected !== mimeType) {
        throw new HttpError(
          415,
          'unsupported_file',
          'Only JPEG, PNG, WebP images and PDF files are accepted.',
        );
      }
      const result = await ai.generateJson({
        task: 'extract',
        systemInstruction: EXTRACTION_INSTRUCTION,
        parts: extractionParts(detected, data),
        schema: extractionSchema,
        temperature: TEMPERATURE.extract,
      });
      const text =
        result.quality === 'unreadable' ? '' : clip(result.text, LIMITS.maxDocumentChars);
      return { quality: text.length === 0 ? 'unreadable' : result.quality, text };
    },
  };
}
