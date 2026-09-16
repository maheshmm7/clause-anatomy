import { z } from 'zod';

/**
 * Converts a Zod schema into the JSON Schema subset accepted by Gemini's
 * `responseJsonSchema`. Zod is the single source of truth; unsupported keywords
 * (e.g. `$schema`, `pattern`, `maxLength`) are stripped recursively.
 */

const SUPPORTED_KEYWORDS = new Set([
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

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function sanitize(node: Json): Json {
  if (Array.isArray(node)) return node.map(sanitize);
  if (node === null || typeof node !== 'object') return node;

  const result: Record<string, Json> = {};
  for (const [key, value] of Object.entries(node)) {
    if (!SUPPORTED_KEYWORDS.has(key)) continue;
    if (key === 'properties' && value && typeof value === 'object' && !Array.isArray(value)) {
      // Keys under `properties` are field names, not keywords: keep all of them.
      result[key] = Object.fromEntries(
        Object.entries(value).map(([field, schema]) => [field, sanitize(schema)]),
      );
    } else {
      result[key] = sanitize(value);
    }
  }
  return result;
}

export function toGeminiJsonSchema(schema: z.ZodType): Json {
  return sanitize(z.toJSONSchema(schema, { unrepresentable: 'any' }) as Json);
}
