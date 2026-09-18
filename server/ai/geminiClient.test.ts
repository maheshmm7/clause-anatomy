import { ApiError } from '@google/genai';
import { describe, expect, it, vi } from 'vitest';
import { answerSchema } from '../../shared/schema.js';
import { HttpError } from '../lib/httpError.js';
import { createGeminiClient, supportsThinkingLevel } from './geminiClient.js';
import type { GenerateJsonRequest } from './types.js';

type Reply = { text: string } | Error;

function fakeSdk(...replies: Reply[]) {
  // Replies are used in order; the last one repeats (like a model that stays overloaded).
  const generateContent = vi.fn(async () => {
    const reply = replies.length > 1 ? replies.shift() : replies[0];
    if (!reply) throw new Error('no reply');
    if (reply instanceof Error) throw reply;
    return reply;
  });
  return { sdk: { models: { generateContent } } as never, generateContent };
}

const REQUEST: GenerateJsonRequest<unknown> = {
  task: 'answer',
  systemInstruction: 'system',
  parts: [{ text: 'PRIVATE DOCUMENT TEXT' }],
  schema: answerSchema,
  temperature: 0.1,
};

const VALID = { text: JSON.stringify({ basis: 'none', answer: 'Ask a lawyer.', quotes: [] }) };

function client(sdk: never, model = 'gemini-3.6-flash', fallbackModel: string | null = null) {
  const logger = { warn: vi.fn() };
  return {
    client: createGeminiClient({
      apiKey: 'k',
      model,
      fallbackModel,
      timeoutMs: 5_000,
      retryDelayMs: 0,
      sdk,
      logger,
    }),
    logger,
  };
}

async function expectHttpError(promise: Promise<unknown>, status: number, code: string) {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(HttpError);
  expect(error).toMatchObject({ status, code });
}

describe('createGeminiClient', () => {
  it('requests JSON constrained by the schema and returns validated data', async () => {
    const { sdk, generateContent } = fakeSdk(VALID);
    const result = await client(sdk).client.generateJson(REQUEST);

    expect(result).toEqual({ basis: 'none', answer: 'Ask a lawyer.', quotes: [] });
    const call = generateContent.mock.calls[0] as unknown as [
      { model: string; config: Record<string, unknown> },
    ];
    expect(call[0].model).toBe('gemini-3.6-flash');
    expect(call[0].config).toMatchObject({
      responseMimeType: 'application/json',
      temperature: 0.1,
      systemInstruction: 'system',
      thinkingConfig: { thinkingLevel: 'LOW' },
    });
    expect(call[0].config.responseJsonSchema).toMatchObject({ type: 'object' });
    expect(call[0].config.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    ['gemini-2.5-flash', { thinkingBudget: 0 }],
    ['gemini-2.5-flash-lite', { thinkingBudget: 0 }],
    ['gemini-2.5-pro', undefined],
    ['gemini-1.5-flash', undefined],
  ])('uses the right thinking settings for %s', async (model, expected) => {
    const { sdk, generateContent } = fakeSdk(VALID);
    await client(sdk, model).client.generateJson(REQUEST);
    const call = generateContent.mock.calls[0] as unknown as [{ config: Record<string, unknown> }];
    expect(call[0].config.thinkingConfig).toEqual(expected);
  });

  it('retries once when the reply is not valid JSON for the schema', async () => {
    const { sdk, generateContent } = fakeSdk({ text: 'not json' }, VALID);
    await expect(client(sdk).client.generateJson(REQUEST)).resolves.toMatchObject({
      basis: 'none',
    });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('fails with ai_bad_response after repeated invalid replies', async () => {
    const { sdk } = fakeSdk({ text: '{"basis":"maybe"}' }, { text: '' });
    await expectHttpError(client(sdk).client.generateJson(REQUEST), 502, 'ai_bad_response');
  });

  it('falls back to plain JSON mode when the model rejects the schema', async () => {
    const { sdk, generateContent } = fakeSdk(
      // What Gemini really says for a schema it cannot enforce.
      new ApiError({
        message: '{"error":{"code":400,"message":"Request contains an invalid argument."}}',
        status: 400,
      }),
      VALID,
    );
    await client(sdk).client.generateJson(REQUEST);
    const second = generateContent.mock.calls[1] as unknown as [
      { config: Record<string, unknown> },
    ];
    expect(second[0].config.responseJsonSchema).toBeUndefined();
  });

  it('moves to the fallback model when the main model is overloaded', async () => {
    const { sdk, generateContent } = fakeSdk(
      new ApiError({ message: 'This model is currently experiencing high demand.', status: 503 }),
      VALID,
    );
    const { client: ai, logger } = client(sdk, 'gemini-3.6-flash', 'gemini-2.5-flash');
    await expect(ai.generateJson(REQUEST)).resolves.toMatchObject({ basis: 'none' });

    const calls = generateContent.mock.calls as unknown as [
      { model: string; config: Record<string, unknown> },
    ][];
    expect(calls.map(([call]) => call.model)).toEqual(['gemini-3.6-flash', 'gemini-2.5-flash']);
    // Gemini 2.5 Flash gets no thinkingLevel (unsupported) and thinking switched off.
    expect(calls[1]?.[0].config.thinkingConfig).toEqual({ thinkingBudget: 0 });
    expect(calls[1]?.[0].config.responseJsonSchema).toBeDefined();
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('PRIVATE DOCUMENT TEXT');
  });

  it('hands a slow main model over to the fallback within its time budget', async () => {
    const { sdk, generateContent } = fakeSdk(new DOMException('slow', 'TimeoutError'), VALID);
    await expect(
      client(sdk, 'gemini-3.6-flash', 'gemini-2.5-flash').client.generateJson(REQUEST),
    ).resolves.toMatchObject({ basis: 'none' });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('does not use the fallback for errors another model cannot fix', async () => {
    const { sdk, generateContent } = fakeSdk(
      new ApiError({ message: 'API key not valid', status: 400 }),
      VALID,
    );
    await expectHttpError(
      client(sdk, 'gemini-3.6-flash', 'gemini-2.5-flash').client.generateJson(REQUEST),
      503,
      'ai_unavailable',
    );
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('waits and retries once when the model says "too many requests"', async () => {
    const { sdk, generateContent } = fakeSdk(
      new ApiError({ message: 'quota', status: 429 }),
      VALID,
    );
    await expect(
      client(sdk, 'gemini-3.6-flash', 'gemini-2.5-flash').client.generateJson(REQUEST),
    ).resolves.toMatchObject({ basis: 'none' });
    const calls = generateContent.mock.calls as unknown as [{ model: string }][];
    // Same model twice: no need to fall back after a short pause.
    expect(calls.map(([call]) => call.model)).toEqual(['gemini-3.6-flash', 'gemini-3.6-flash']);
  });

  it('reports busy when the fallback is overloaded too', async () => {
    const { sdk } = fakeSdk(
      new ApiError({ message: 'overloaded', status: 503 }),
      new ApiError({ message: 'quota', status: 429 }),
    );
    await expectHttpError(
      client(sdk, 'gemini-3.6-flash', 'gemini-2.5-flash').client.generateJson(REQUEST),
      503,
      'ai_busy',
    );
  });

  it.each([
    // A rate limit gets one short retry; everything else fails at once.
    [new ApiError({ message: 'quota', status: 429 }), 503, 'ai_busy', 2],
    [new ApiError({ message: 'overloaded', status: 503 }), 503, 'ai_busy', 1],
    [new ApiError({ message: 'API key not valid', status: 400 }), 503, 'ai_unavailable', 1],
    [new DOMException('timed out', 'TimeoutError'), 504, 'ai_busy', 1],
    [new TypeError('fetch failed'), 503, 'ai_unavailable', 1],
  ])('maps %s to a safe client error', async (failure, status, code, calls) => {
    const { sdk, generateContent } = fakeSdk(failure);
    await expectHttpError(client(sdk).client.generateJson(REQUEST), status, code);
    expect(generateContent).toHaveBeenCalledTimes(calls);
  });

  it('never logs the document or prompt', async () => {
    const { sdk } = fakeSdk(new ApiError({ message: 'quota', status: 429 }));
    const { client: gemini, logger } = client(sdk);
    await gemini.generateJson(REQUEST).catch(() => undefined);
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('PRIVATE DOCUMENT TEXT');
    expect(logger.warn).toHaveBeenCalledWith('[ai] answer failed', {
      status: 429,
      reason: 'quota',
    });
  });
});

describe('supportsThinkingLevel', () => {
  it('detects Gemini 3+ models', () => {
    expect(supportsThinkingLevel('gemini-3.6-flash')).toBe(true);
    expect(supportsThinkingLevel('gemini-10-pro')).toBe(true);
    expect(supportsThinkingLevel('gemini-2.5-flash')).toBe(false);
    expect(supportsThinkingLevel('custom-model')).toBe(false);
  });
});
