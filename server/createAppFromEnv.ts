import type { Express } from 'express';
import { createGeminiClient } from './ai/geminiClient.js';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

/**
 * Wires configuration to the app. Used by the dev server (Vite), the Node server
 * and the serverless entry point so every environment behaves identically.
 */
export function createAppFromEnv(
  env: Record<string, string | undefined>,
  options: { staticDir?: string } = {},
): Express {
  const config = loadConfig(env);
  const ai = config.geminiApiKey
    ? createGeminiClient({
        apiKey: config.geminiApiKey,
        model: config.geminiModel,
        timeoutMs: config.aiTimeoutMs,
      })
    : null;

  if (!ai) {
    console.warn(
      '[server] GEMINI_API_KEY is not set: live AI is disabled, built-in examples still work.',
    );
  }

  return createApp({ ai, rateLimitMax: config.rateLimitMax, ...options });
}
