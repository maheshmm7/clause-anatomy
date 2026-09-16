import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import vercelHandler from '../api/index.js';
import { createAppFromEnv } from './createAppFromEnv.js';

describe('createAppFromEnv', () => {
  it('runs without an API key, reporting AI as unavailable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const app = createAppFromEnv({});
    const res = await request(app).get('/api/health');
    expect(res.body).toEqual({ status: 'ok', aiAvailable: false });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('GEMINI_API_KEY is not set'));
  });

  it('enables AI when a key is configured, without calling the API at start-up', async () => {
    const app = createAppFromEnv({ GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'gemini-3.6-flash' });
    const res = await request(app).get('/api/health');
    expect(res.body.aiAvailable).toBe(true);
  });

  it('fails fast on invalid configuration', () => {
    expect(() => createAppFromEnv({ RATE_LIMIT_MAX: 'lots' })).toThrow(/RATE_LIMIT_MAX/);
  });

  it('exports a serverless handler that serves the API', async () => {
    const res = await request(vercelHandler).get('/api/health');
    expect(res.status).toBe(200);
  });
});
