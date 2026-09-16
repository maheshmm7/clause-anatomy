import { ApiError, GoogleGenAI, ThinkingLevel } from '@google/genai';
import { HttpError } from '../lib/httpError.js';
import { toGeminiJsonSchema } from './geminiSchema.js';
import type { AiClient, GenerateJsonRequest } from './types.js';

export interface GeminiClientOptions {
  apiKey: string;
  model: string;
  timeoutMs: number;
  /** Injected for tests; defaults to the real SDK. */
  sdk?: Pick<GoogleGenAI, 'models'>;
  logger?: Pick<Console, 'warn'>;
}

/** How many times a reply that is not valid JSON for the schema is re-requested. */
const MAX_ATTEMPTS = 2;

class InvalidModelOutput extends Error {}

/** `thinkingLevel` exists from the Gemini 3 generation onwards; older models reject it. */
export function supportsThinkingLevel(model: string): boolean {
  const generation = /^gemini-(\d+)/.exec(model)?.[1];
  return generation !== undefined && Number(generation) >= 3;
}

function isSchemaRejection(error: unknown): boolean {
  return error instanceof ApiError && error.status === 400 && /schema/i.test(error.message);
}

/** Maps SDK / network failures to safe client-facing errors. Details go to server logs only. */
function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) return error;
  if (
    error instanceof DOMException &&
    (error.name === 'AbortError' || error.name === 'TimeoutError')
  ) {
    return new HttpError(504, 'ai_busy', 'The AI took too long to respond. Please try again.');
  }
  if (error instanceof ApiError) {
    if (error.status === 429 || error.status >= 500) {
      return new HttpError(503, 'ai_busy', 'The AI service is busy. Please try again in a minute.');
    }
    return new HttpError(503, 'ai_unavailable', 'The AI service is not available right now.');
  }
  if (error instanceof InvalidModelOutput) {
    return new HttpError(
      502,
      'ai_bad_response',
      'The AI returned an unexpected answer. Please try again.',
    );
  }
  return new HttpError(503, 'ai_unavailable', 'The AI service is not available right now.');
}

/**
 * Gemini implementation of {@link AiClient}.
 *
 * - Structured output: the Zod schema is sent as `responseJsonSchema` and the reply
 *   is validated again with Zod (never trust model output shape).
 * - Low temperature and low thinking level keep answers factual and fast.
 * - Every call has a hard timeout.
 * - If a model rejects the schema, it retries once in plain JSON mode; Zod still validates.
 */
export function createGeminiClient(options: GeminiClientOptions): AiClient {
  const sdk = options.sdk ?? new GoogleGenAI({ apiKey: options.apiKey });
  const logger = options.logger ?? console;

  async function callModel<T>(request: GenerateJsonRequest<T>, useSchema: boolean): Promise<T> {
    const response = await sdk.models.generateContent({
      model: options.model,
      contents: [{ role: 'user', parts: request.parts }],
      config: {
        systemInstruction: request.systemInstruction,
        temperature: request.temperature,
        responseMimeType: 'application/json',
        ...(useSchema ? { responseJsonSchema: toGeminiJsonSchema(request.schema) } : {}),
        ...(supportsThinkingLevel(options.model)
          ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
          : {}),
        abortSignal: AbortSignal.timeout(options.timeoutMs),
      },
    });

    const raw = response.text;
    if (!raw) throw new InvalidModelOutput('empty response');

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new InvalidModelOutput('response is not JSON');
    }
    const parsed = request.schema.safeParse(json);
    if (!parsed.success) throw new InvalidModelOutput('response does not match schema');
    return parsed.data;
  }

  return {
    async generateJson<T>(request: GenerateJsonRequest<T>): Promise<T> {
      let useSchema = true;
      let lastError: unknown;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
          return await callModel(request, useSchema);
        } catch (error) {
          lastError = error;
          if (useSchema && isSchemaRejection(error)) {
            useSchema = false;
            continue;
          }
          if (!(error instanceof InvalidModelOutput)) break;
        }
      }

      const status = lastError instanceof ApiError ? lastError.status : undefined;
      const reason = lastError instanceof Error ? lastError.message.slice(0, 200) : 'unknown';
      // Never log prompts or documents — only the task, status and a short reason.
      logger.warn(`[ai] ${request.task} failed`, { status, reason });
      throw toHttpError(lastError);
    },
  };
}
