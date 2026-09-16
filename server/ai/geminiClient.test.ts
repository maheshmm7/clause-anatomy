import { ApiError } from '@google/genai';
import { describe, expect, it, vi } from 'vitest';
import { answerSchema } from '../../shared/schema.js';
import { HttpError } from '../lib/httpError.js';
import { createGeminiClient, supportsThinkingLevel } from './geminiClient.js';
import type { GenerateJsonRequest } from './types.js';

type Reply = { text: string } | Error;

function fakeSdk(...replies: Reply[]) {
  const generateContent = vi.fn(async () => {
    const reply = replies.shift();
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

function client(sdk: never, model = 'gemini-3.6-flash') {
  const logger = { warn: vi.fn() };
  return {
    client: createGeminiClient({ apiKey: 'k', model, timeoutMs: 5_000, sdk, logger }),
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

  it('omits thinking settings for older models', async () => {
    const { sdk, generateContent } = fakeSdk(VALID);
    await client(sdk, 'gemini-2.5-flash').client.generateJson(REQUEST);
    const call = generateContent.mock.calls[0] as unknown as [{ config: Record<string, unknown> }];
    expect(call[0].config.thinkingConfig).toBeUndefined();
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
      new ApiError({ message: 'Invalid JSON schema: too complex', status: 400 }),
      VALID,
    );
    await client(sdk).client.generateJson(REQUEST);
    const second = generateContent.mock.calls[1] as unknown as [
      { config: Record<string, unknown> },
    ];
    expect(second[0].config.responseJsonSchema).toBeUndefined();
  });

  it.each([
    [new ApiError({ message: 'quota', status: 429 }), 503, 'ai_busy'],
    [new ApiError({ message: 'overloaded', status: 503 }), 503, 'ai_busy'],
    [new ApiError({ message: 'API key not valid', status: 400 }), 503, 'ai_unavailable'],
    [new DOMException('timed out', 'TimeoutError'), 504, 'ai_busy'],
    [new TypeError('fetch failed'), 503, 'ai_unavailable'],
  ])('maps %s to a safe client error', async (failure, status, code) => {
    const { sdk, generateContent } = fakeSdk(failure);
    await expectHttpError(client(sdk).client.generateJson(REQUEST), status, code);
    expect(generateContent).toHaveBeenCalledTimes(1);
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
