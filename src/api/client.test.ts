import { describe, expect, it, vi } from 'vitest';
import { stubFetch } from '../test/helpers';
import { ApiClientError, api } from './client';

const expectCode = async (promise: Promise<unknown>, code: string) => {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ApiClientError);
  expect((error as ApiClientError).code).toBe(code);
};

describe('api client', () => {
  it('returns validated data and sends JSON bodies', async () => {
    const { calls } = stubFetch({
      '/api/ask': {
        body: { basis: 'document', answer: 'Yes', quotes: [{ text: 'quote', verified: true }] },
      },
    });
    const result = await api.ask({
      text: 'document text '.repeat(5),
      question: 'Why?',
      language: 'en',
    });
    expect(result.answer).toBe('Yes');
    expect(calls[0]).toEqual({
      path: '/api/ask',
      body: { text: 'document text '.repeat(5), question: 'Why?', language: 'en' },
    });
  });

  it('maps server error codes', async () => {
    stubFetch({
      '/api/analyze': {
        status: 429,
        body: { error: { code: 'rate_limited', message: 'slow down' } },
      },
    });
    await expectCode(api.analyze({ text: 'x'.repeat(50), language: 'en' }), 'rate_limited');
  });

  it('treats unknown error bodies as internal errors', async () => {
    stubFetch({ '/api/health': { status: 500, body: '<html>oops</html>' } });
    await expectCode(api.health(), 'internal');
  });

  it('rejects responses that do not match the expected shape', async () => {
    stubFetch({
      '/api/health': { body: { status: 'ok', aiAvailable: 'yes', injected: '<script>' } },
    });
    await expectCode(api.health(), 'ai_bad_response');
  });

  it('reports network failures and cancellations distinctly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    );
    await expectCode(api.health(), 'network');

    const controller = new AbortController();
    controller.abort();
    await expectCode(api.health(controller.signal), 'cancelled');
  });
});
