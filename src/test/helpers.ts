import axe from 'axe-core';
import { expect, vi } from 'vitest';

/**
 * Runs axe-core accessibility rules against rendered markup. Colour contrast is
 * checked in the browser end-to-end tests instead, because jsdom cannot compute styles.
 */
export async function expectNoAxeViolations(container: Element): Promise<void> {
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false } },
  });
  const summary = results.violations.map((violation) => `${violation.id}: ${violation.help}`);
  expect(summary).toEqual([]);
}

export interface FakeRoute {
  status?: number;
  body: unknown;
}

/** Stubs `fetch` with per-path JSON replies and records every request body. */
export function stubFetch(routes: Record<string, FakeRoute | FakeRoute[]>) {
  const calls: { path: string; body: unknown }[] = [];
  const queues = new Map(
    Object.entries(routes).map(([path, reply]) => [
      path,
      Array.isArray(reply) ? [...reply] : reply,
    ]),
  );

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = typeof input === 'string' ? input : input.toString();
    calls.push({ path, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const entry = queues.get(path);
    const reply = Array.isArray(entry) ? (entry.length > 1 ? entry.shift() : entry[0]) : entry;
    if (!reply)
      return new Response(JSON.stringify({ error: { code: 'not_found', message: 'x' } }), {
        status: 404,
      });
    return new Response(JSON.stringify(reply.body), {
      status: reply.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}
