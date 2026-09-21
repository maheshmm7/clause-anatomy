import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { analysisSchema } from '../../shared/schema.js';
import { fitArraysToSchema, toGeminiJsonSchema } from './geminiSchema.js';

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
        items: { type: 'array', description: 'At most 2 items.', items: { type: 'string' } },
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

  it('never sends array size limits, which make Gemini reject large schemas', () => {
    const json = JSON.stringify(toGeminiJsonSchema(analysisSchema));
    expect(json).not.toContain('maxItems');
    expect(json).toContain('At most 15 items.');
  });

  it('marks optional fields as not required', () => {
    const json = toGeminiJsonSchema(analysisSchema) as { required: string[] };
    expect(json.required).toContain('points');
    expect(json.required).not.toContain('notice');
  });
});

describe('schema conversion cost', () => {
  it('converts each schema once and reuses the result on every call', () => {
    const schema = z.object({ items: z.array(z.string()).max(2) });
    const first = toGeminiJsonSchema(schema);
    // Same object, not an equal copy: nothing is rebuilt per request.
    expect(toGeminiJsonSchema(schema)).toBe(first);
    expect(toGeminiJsonSchema(analysisSchema)).toBe(toGeminiJsonSchema(analysisSchema));
    // Different schemas never share a result.
    expect(toGeminiJsonSchema(z.object({ other: z.string() }))).not.toBe(first);
    // Reusing the cached conversion still trims replies correctly, every time.
    expect(fitArraysToSchema({ items: ['a', 'b', 'c'] }, schema)).toEqual({ items: ['a', 'b'] });
    expect(fitArraysToSchema({ items: ['a', 'b', 'c'] }, schema)).toEqual({ items: ['a', 'b'] });
  });
});

describe('fitArraysToSchema', () => {
  const schema = z.object({
    tags: z.array(z.string()).max(2),
    groups: z.array(z.object({ ids: z.array(z.number()).max(1) })).max(3),
    note: z.object({ lines: z.array(z.string()).max(1) }).nullable(),
  });

  it('trims over-long arrays at every depth, including inside nullable objects', () => {
    const reply = {
      tags: ['a', 'b', 'c'],
      groups: [{ ids: [1, 2] }, { ids: [3] }],
      note: { lines: ['x', 'y'] },
    };
    const fitted = fitArraysToSchema(reply, schema);
    expect(fitted).toEqual({
      tags: ['a', 'b'],
      groups: [{ ids: [1] }, { ids: [3] }],
      note: { lines: ['x'] },
    });
    expect(schema.safeParse(fitted).success).toBe(true);
  });

  it('leaves values it cannot map untouched so Zod can still reject them', () => {
    expect(fitArraysToSchema({ tags: 'nope', note: null }, schema)).toEqual({
      tags: 'nope',
      note: null,
    });
    expect(fitArraysToSchema('text', schema)).toBe('text');
  });
});
