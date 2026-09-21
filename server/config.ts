import { z } from 'zod';

/** Default model: a stable, fast Gemini model with JSON output and image understanding. */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';

/** Stable model used when the main one is overloaded. Set to `none` to disable. */
export const DEFAULT_GEMINI_FALLBACK_MODEL = 'gemini-2.5-flash';

const modelId = z
  .string()
  .trim()
  .regex(/^[a-z0-9.-]{3,64}$/, 'must be a plain model id');

const envSchema = z.object({
  GEMINI_API_KEY: z.string().trim().optional(),
  GEMINI_MODEL: modelId.optional(),
  GEMINI_FALLBACK_MODEL: modelId.optional(),
  PORT: z.coerce.number().int().min(1).max(65_535).optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(10_000).optional(),
  AI_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(300_000).optional(),
  NODE_ENV: z.string().optional(),
});

export interface ServerConfig {
  geminiApiKey: string | null;
  geminiModel: string;
  /** `null` when disabled. */
  geminiFallbackModel: string | null;
  port: number;
  /** Max AI requests per client IP per window. */
  rateLimitMax: number;
  aiTimeoutMs: number;
  isProduction: boolean;
}

/**
 * Parses environment variables once at start-up. Invalid values fail fast with a
 * readable message instead of surfacing later as confusing runtime errors.
 * The API key itself is never logged.
 */
export function loadConfig(env: Record<string, string | undefined>): ServerConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${details.join('\n')}`);
  }
  const values = parsed.data;
  return {
    geminiApiKey: values.GEMINI_API_KEY ? values.GEMINI_API_KEY : null,
    geminiModel: values.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL,
    geminiFallbackModel:
      values.GEMINI_FALLBACK_MODEL === 'none'
        ? null
        : (values.GEMINI_FALLBACK_MODEL ?? DEFAULT_GEMINI_FALLBACK_MODEL),
    port: values.PORT ?? 8787,
    rateLimitMax: values.RATE_LIMIT_MAX ?? 30,
    aiTimeoutMs: values.AI_TIMEOUT_MS ?? 120_000,
    isProduction: values.NODE_ENV === 'production',
  };
}
