import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { analysisSchema } from '../../shared/schema.js';
import { toGeminiJsonSchema } from './geminiSchema.js';

describe('toGeminiJsonSchema', () => {
  it('strips unsupported keywords but keeps field names that look like keywords', () => {
    const schema = z.object({
      title: z.string().min(3).max(10).regex(/a/).describe('A title'),
      description: z.string(),
      items: z.array(z.string()).max(2),
    });
    expect(toGeminiJsonSchema(schema)).toEqual({
      type: 'object',
      properties: {
        title: { type: 'string', description: 'A title' },
        description: { type: 'string' },
        items: { type: 'array', maxItems: 2, items: { type: 'string' } },
      },
      required: ['title', 'description', 'items'],
      additionalProperties: false,
    });
  });

  it('only uses keywords Gemini supports for the full analysis schema', () => {
    const allowed = new Set([
      'type',
      'format',
      'title',
      'description',
      'enum',
      'items',
      'prefixItems',
      'minItems',
      'maxItems',
      'minimum',
      'maximum',
      'anyOf',
      'oneOf',
      'properties',
      'additionalProperties',
      'required',
    ]);
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== 'object') return;
      for (const [key, value] of Object.entries(node)) {
        if (key === 'properties') {
          Object.values(value as object).forEach(walk);
          continue;
        }
        expect(allowed.has(key), `unsupported keyword ${key}`).toBe(true);
        walk(value);
      }
    };
    walk(toGeminiJsonSchema(analysisSchema));
  });

  it('marks optional fields as not required', () => {
    const json = toGeminiJsonSchema(analysisSchema) as { required: string[] };
    expect(json.required).toContain('points');
    expect(json.required).not.toContain('notice');
  });
});
