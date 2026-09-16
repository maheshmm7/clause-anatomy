import type { z } from 'zod';
import type {
  AnalysisResult,
  AnalyzeRequest,
  AnswerResult,
  ApiErrorCode,
  AskRequest,
  ExtractRequest,
  ExtractResult,
  HealthResult,
} from '../../shared/schema';
import type * as SchemaModule from '../../shared/schema';

type Schemas = typeof SchemaModule;

/**
 * Response validation needs the schema library, which is not needed to paint the first
 * screen. It is loaded on first use (in parallel with the network request) and cached.
 */
let schemasPromise: Promise<Schemas> | null = null;
const loadSchemas = (): Promise<Schemas> => (schemasPromise ??= import('../../shared/schema'));

export type ClientErrorCode = ApiErrorCode | 'network' | 'cancelled';

export class ApiClientError extends Error {
  readonly code: ClientErrorCode;

  constructor(code: ClientErrorCode) {
    super(code);
    this.name = 'ApiClientError';
    this.code = code;
  }
}

/** Longer than the server's AI timeout, so the server can answer with a clear error first. */
const REQUEST_TIMEOUT_MS = 130_000;

interface RequestInit {
  method: 'GET' | 'POST';
  body?: unknown;
  signal?: AbortSignal;
}

async function request<T>(
  path: string,
  pickSchema: (schemas: Schemas) => z.ZodType<T>,
  init: RequestInit,
): Promise<T> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init.signal ? AbortSignal.any([timeout, init.signal]) : timeout;
  const schemas = loadSchemas();

  let response: Response;
  try {
    response = await fetch(path, {
      method: init.method,
      headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal,
      credentials: 'same-origin',
    });
  } catch {
    if (init.signal?.aborted) throw new ApiClientError('cancelled');
    throw new ApiClientError(timeout.aborted ? 'ai_busy' : 'network');
  }

  const json: unknown = await response.json().catch(() => null);
  const { apiErrorSchema } = await schemas;
  if (!response.ok) {
    const error = apiErrorSchema.safeParse(json);
    throw new ApiClientError(error.success ? error.data.error.code : 'internal');
  }
  // Never trust the network: validate the shape before the UI renders it.
  const parsed = pickSchema(await schemas).safeParse(json);
  if (!parsed.success) throw new ApiClientError('ai_bad_response');
  return parsed.data;
}

export const api = {
  health: (signal?: AbortSignal): Promise<HealthResult> =>
    request('/api/health', (s) => s.healthSchema, { method: 'GET', signal }),
  analyze: (body: AnalyzeRequest, signal?: AbortSignal): Promise<AnalysisResult> =>
    request('/api/analyze', (s) => s.analysisResultSchema, { method: 'POST', body, signal }),
  ask: (body: AskRequest, signal?: AbortSignal): Promise<AnswerResult> =>
    request('/api/ask', (s) => s.answerResultSchema, { method: 'POST', body, signal }),
  extract: (body: ExtractRequest, signal?: AbortSignal): Promise<ExtractResult> =>
    request('/api/extract', (s) => s.extractResultSchema, { method: 'POST', body, signal }),
};
