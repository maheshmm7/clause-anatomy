import type { z } from 'zod';

export type AiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export interface GenerateJsonRequest<T> {
  /** Short task name, used only for logs. */
  task: 'analyze' | 'extract' | 'answer';
  systemInstruction: string;
  parts: AiPart[];
  /** Zod schema: constrains the model output and validates the reply. */
  schema: z.ZodType<T>;
  temperature: number;
}

/**
 * The only surface the rest of the server uses to talk to a model.
 * Production uses Gemini; tests inject a fake, so no test ever needs network or a key.
 */
export interface AiClient {
  generateJson<T>(request: GenerateJsonRequest<T>): Promise<T>;
}
