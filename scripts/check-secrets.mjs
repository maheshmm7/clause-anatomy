#!/usr/bin/env node
/**
 * Fails if anything that looks like a real secret is committed.
 * Scans every file tracked by git (or, before the first commit, every file git would add).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const PATTERNS = [
  { name: 'Google API key', regex: /AIza[0-9A-Za-z_-]{35}/ },
  { name: 'Private key block', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  {
    name: 'Generic secret assignment',
    regex: /(?:api[_-]?key|secret|token|password)\s*[:=]\s*['"][A-Za-z0-9_-]{24,}['"]/i,
  },
  { name: 'Environment file', regex: null, file: /(^|\/)\.env(\.(?!example$)[^/]+)?$/ },
];

const listFiles = () => {
  const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    encoding: 'utf8',
  });
  return tracked.split('\n').filter(Boolean);
};

const findings = [];
for (const file of listFiles()) {
  for (const pattern of PATTERNS) {
    if (pattern.file?.test(file)) findings.push(`${file}: ${pattern.name} must not be committed`);
  }
  let size = 0;
  try {
    size = statSync(file).size;
  } catch {
    continue; // Deleted in the working tree.
  }
  if (size > 1_000_000) continue;
  const content = readFileSync(file, 'utf8');
  for (const pattern of PATTERNS) {
    if (pattern.regex?.test(content)) findings.push(`${file}: possible ${pattern.name}`);
  }
}

if (findings.length > 0) {
  console.error(`Secret scan failed:\n${findings.map((line) => `  - ${line}`).join('\n')}`);
  process.exit(1);
}
console.log('Secret scan passed: no secrets found in repository files.');
