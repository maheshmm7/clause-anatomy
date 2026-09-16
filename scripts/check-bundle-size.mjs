#!/usr/bin/env node
/**
 * Performance budget for the first page load (gzip sizes of the entry JS and CSS).
 * Lazy chunks (results view, examples, pdf.js, schema validation) are excluded on
 * purpose: they only load when the reader needs them.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_BYTES = { js: 110_000, css: 14_000 };
const dist = 'dist';
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const entryFiles = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.(js|css))"/g)].map(
  (match) => ({
    file: match[1],
    kind: match[2],
  }),
);

const totals = { js: 0, css: 0 };
for (const { file, kind } of entryFiles) {
  const size = gzipSync(readFileSync(join(dist, file))).length;
  totals[kind] += size;
  console.log(`${file}: ${(size / 1024).toFixed(1)} KB gzip`);
}

const lazy = readdirSync(join(dist, 'assets')).length - entryFiles.length;
console.log(
  `Entry total: JS ${(totals.js / 1024).toFixed(1)} KB, CSS ${(totals.css / 1024).toFixed(1)} KB (${lazy} lazy assets)`,
);

const over = Object.entries(BUDGET_BYTES).filter(([kind, budget]) => totals[kind] > budget);
if (over.length > 0) {
  console.error(
    `Bundle budget exceeded: ${over.map(([kind, budget]) => `${kind} > ${budget / 1000} KB`).join(', ')}`,
  );
  process.exit(1);
}
console.log('Bundle budget passed.');
