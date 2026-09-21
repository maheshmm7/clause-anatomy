import { z } from 'zod';

/**
 * Converts a Zod schema into the JSON Schema subset accepted by Gemini's
 * `responseJsonSchema`. Zod is the single source of truth; unsupported keywords
 * (e.g. `$schema`, `pattern`, `maxLength`) are stripped recursively.
 *
 * Array size limits are NOT sent as `maxItems`: on large schemas (like the analysis)
 * Gemini rejects the request as "invalid argument" because the constraints become too
 * complex to enforce. The limit is stated in the description instead, and
 * {@link fitArraysToSchema} trims any extra items before validation.
 */

const SUPPORTED_KEYWORDS = new Set([
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

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };

const isObject = (value: unknown): value is JsonObject =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function sanitize(node: Json): Json {
  if (Array.isArray(node)) return node.map(sanitize);
  if (!isObject(node)) return node;

  const result: JsonObject = {};
  for (const [key, value] of Object.entries(node)) {
    if (!SUPPORTED_KEYWORDS.has(key)) continue;
    if (key === 'properties' && isObject(value)) {
      // Keys under `properties` are field names, not keywords: keep all of them.
      result[key] = Object.fromEntries(
        Object.entries(value).map(([field, schema]) => [field, sanitize(schema)]),
      );
    } else {
      result[key] = sanitize(value);
    }
  }
  if (typeof node.maxItems === 'number') {
    const limit = `At most ${node.maxItems} items.`;
    result.description =
      typeof result.description === 'string' ? `${result.description} ${limit}` : limit;
  }
  return result;
}

const toJsonSchema = (schema: z.ZodType): Json =>
  z.toJSONSchema(schema, { unrepresentable: 'any' }) as Json;

export function toGeminiJsonSchema(schema: z.ZodType): Json {
  return sanitize(toJsonSchema(schema));
}

function fit(value: unknown, node: Json): unknown {
  if (!isObject(node)) return value;
  for (const key of ['anyOf', 'oneOf'] as const) {
    const options = node[key];
    if (Array.isArray(options)) {
      return options.reduce<unknown>((current, option) => fit(current, option), value);
    }
  }
  if (Array.isArray(value)) {
    const limit = typeof node.maxItems === 'number' ? node.maxItems : value.length;
    return value.slice(0, limit).map((item) => fit(item, node.items ?? null));
  }
  if (isObject(value) && isObject(node.properties)) {
    const properties = node.properties;
    return Object.fromEntries(
      Object.entries(value).map(([field, item]) => [field, fit(item, properties[field] ?? null)]),
    );
  }
  return value;
}

/**
 * Trims arrays in a model reply to the schema's `maxItems`, so an over-long list is
 * shortened instead of failing validation. Everything else is still checked by Zod.
 */
export function fitArraysToSchema(value: unknown, schema: z.ZodType): unknown {
  return fit(value, toJsonSchema(schema));
}
