import { ApiError, GoogleGenAI, ThinkingLevel } from '@google/genai';
import { HttpError } from '../lib/httpError.js';
import { fitArraysToSchema, toGeminiJsonSchema } from './geminiSchema.js';
import type { AiClient, GenerateJsonRequest } from './types.js';

export interface GeminiClientOptions {
  apiKey: string;
  model: string;
  /** Used when the main model is overloaded or rate limited (e.g. a stable older model). */
  fallbackModel?: string | null;
  timeoutMs: number;
  /** Pause before retrying a model that said "too many requests" (default 2 s). */
  retryDelayMs?: number;
  /** Injected for tests; defaults to the real SDK. */
  sdk?: Pick<GoogleGenAI, 'models'>;
  logger?: Pick<Console, 'warn'>;
}

/** How many times a reply that is not valid JSON for the schema is re-requested. */
const MAX_ATTEMPTS = 2;

class InvalidModelOutput extends Error {}

function isRateLimited(error: unknown): boolean {
  return error instanceof ApiError && error.status === 429;
}

/** How long the main model may take before a request moves to the fallback model. */
const PRIMARY_MODEL_BUDGET_MS = 45_000;

function isTimeout(error: unknown): boolean {
  return (
    error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError')
  );
}

/**
 * Google's "high demand" (503) and quota (429) errors, or a model too slow under load:
 * another model may still answer.
 */
function isOverloaded(error: unknown): boolean {
  return (
    isTimeout(error) || (error instanceof ApiError && (error.status === 429 || error.status >= 500))
  );
}

/** `thinkingLevel` exists from the Gemini 3 generation onwards; older models reject it. */
export function supportsThinkingLevel(model: string): boolean {
  const generation = /^gemini-(\d+)/.exec(model)?.[1];
  return generation !== undefined && Number(generation) >= 3;
}

/**
 * Thinking settings per model. Gemini 3 uses a low thinking level; Gemini 2.5 Flash
 * models think by default, which makes long structured replies (like translating a
 * whole explanation) very slow, so thinking is switched off for them.
 */
export function thinkingConfigFor(
  model: string,
): { thinkingLevel: ThinkingLevel } | { thinkingBudget: number } | undefined {
  if (supportsThinkingLevel(model)) return { thinkingLevel: ThinkingLevel.LOW };
  if (/^gemini-2\.5-flash/.test(model)) return { thinkingBudget: 0 };
  return undefined;
}

/**
 * A 400 while a response schema is attached is treated as the schema being rejected:
 * Gemini often reports this only as a generic "Request contains an invalid argument".
 * The retry runs in plain JSON mode; Zod still validates the reply. (An invalid API key
 * is also a 400, but retrying cannot help, so it is excluded.)
 */
function isSchemaRejection(error: unknown): boolean {
  return error instanceof ApiError && error.status === 400 && !isKeyRejection(error);
}

/** The API key itself was refused (wrong, revoked or without access to the model). */
function isKeyRejection(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 401 ||
      error.status === 403 ||
      (error.status === 400 && /api[ _]?key/i.test(error.message)))
  );
}

/** Maps SDK / network failures to safe client-facing errors. Details go to server logs only. */
function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) return error;
  if (isTimeout(error)) {
    return new HttpError(504, 'ai_busy', 'The AI took too long to respond. Please try again.');
  }
  if (isKeyRejection(error)) {
    return new HttpError(401, 'ai_key_invalid', 'The Gemini API key was not accepted.');
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
 * - If the main model is overloaded, the request moves to the fallback model, so demand
 *   spikes on one model do not reach the reader as an error.
 */
export function createGeminiClient(options: GeminiClientOptions): AiClient {
  const sdk = options.sdk ?? new GoogleGenAI({ apiKey: options.apiKey });
  const logger = options.logger ?? console;

  async function callModel<T>(
    model: string,
    request: GenerateJsonRequest<T>,
    useSchema: boolean,
    timeoutMs: number,
  ): Promise<T> {
    const thinkingConfig = thinkingConfigFor(model);
    const response = await sdk.models.generateContent({
      model,
      contents: [{ role: 'user', parts: request.parts }],
      config: {
        systemInstruction: request.systemInstruction,
        temperature: request.temperature,
        responseMimeType: 'application/json',
        ...(useSchema ? { responseJsonSchema: toGeminiJsonSchema(request.schema) } : {}),
        ...(thinkingConfig ? { thinkingConfig } : {}),
        abortSignal: AbortSignal.timeout(timeoutMs),
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
    const parsed = request.schema.safeParse(fitArraysToSchema(json, request.schema));
    if (!parsed.success) throw new InvalidModelOutput('response does not match schema');
    return parsed.data;
  }

  return {
    async generateJson<T>(request: GenerateJsonRequest<T>): Promise<T> {
      const hasFallback = Boolean(options.fallbackModel && options.fallbackModel !== options.model);
      // With a fallback, a slow main model hands over early instead of making readers wait.
      const primaryBudget = hasFallback
        ? Math.min(PRIMARY_MODEL_BUDGET_MS, Math.round(options.timeoutMs / 2))
        : options.timeoutMs;
      const plan = [{ model: options.model, timeoutMs: primaryBudget }];
      if (hasFallback && options.fallbackModel) {
        plan.push({ model: options.fallbackModel, timeoutMs: options.timeoutMs - primaryBudget });
      }
      let lastError: unknown;

      for (const { model, timeoutMs } of plan) {
        let useSchema = true;
        let waitedForRateLimit = false;
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
          try {
            return await callModel(model, request, useSchema, timeoutMs);
          } catch (error) {
            lastError = error;
            if (useSchema && isSchemaRejection(error)) {
              useSchema = false;
              continue;
            }
            // Free-tier keys have per-minute limits: a short pause usually clears them.
            if (isRateLimited(error) && !waitedForRateLimit) {
              waitedForRateLimit = true;
              await new Promise((resolve) => setTimeout(resolve, options.retryDelayMs ?? 2_000));
              attempt -= 1;
              continue;
            }
            if (!(error instanceof InvalidModelOutput)) break;
          }
        }
        if (!isOverloaded(lastError)) break;
        logger.warn(`[ai] ${request.task}: ${model} is overloaded or too slow`, {
          status: lastError instanceof ApiError ? lastError.status : 'timeout',
        });
      }

      const status = lastError instanceof ApiError ? lastError.status : undefined;
      // The key never appears in logs, even if an error message were to repeat it.
      const reason =
        lastError instanceof Error
          ? lastError.message.split(options.apiKey).join('[key]').slice(0, 200)
          : 'unknown';
      // Never log prompts or documents — only the task, status and a short reason.
      logger.warn(`[ai] ${request.task} failed`, { status, reason });
      throw toHttpError(lastError);
    },
  };
}
