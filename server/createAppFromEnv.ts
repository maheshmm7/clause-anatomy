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
  const clientFor = (apiKey: string) =>
    createGeminiClient({
      apiKey,
      model: config.geminiModel,
      fallbackModel: config.geminiFallbackModel,
      timeoutMs: config.aiTimeoutMs,
    });
  const ai = config.geminiApiKey ? clientFor(config.geminiApiKey) : null;

  if (!ai) {
    console.warn(
      '[server] GEMINI_API_KEY is not set: readers can add their own key; examples still work.',
    );
  }

  return createApp({ ai, aiForKey: clientFor, rateLimitMax: config.rateLimitMax, ...options });
}
