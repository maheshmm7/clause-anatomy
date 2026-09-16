# Security

Clause Anatomy handles sensitive personal documents. This page describes the threat model and the controls in the code.

## Data handling

| Principle         | Implementation                                                                                                                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No storage        | The server keeps no database, files or logs of document content. API responses are `Cache-Control: no-store`. The browser keeps documents in memory only.                                           |
| Data minimisation | Aadhaar, PAN, phone, email, UPI, card (Luhn-checked), bank account, passport and voter ID numbers are redacted **in the browser** before sending, and **again on the server** (`shared/redact.ts`). |
| Informed consent  | Photos and scans cannot be redacted before transcription; the reader is told this in plain language and must agree before upload (`ConsentPanel`).                                                  |
| Preferences only  | `localStorage` stores only language and reading-level preferences.                                                                                                                                  |

## Threats and controls

| Threat                         | Control                                                                                                                                                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API key theft                  | Key read from environment on the server only (`server/config.ts`); never bundled; `.env` git-ignored; `npm run check:secrets` scans the repository.                                                                                                                            |
| Prompt injection via documents | Document and question fenced with a random per-request boundary; forged boundaries neutralised; system prompt declares both untrusted; output schema-constrained and validated; quotes verified against the source (`server/ai/prompts.ts`, `server/services/postprocess.ts`). |
| Hallucinated legal content     | Quote verification, visible "Found in your paper" / "Could not find" badges, no quizzes on unverified points, ungrounded "document" answers downgraded to "general", explicit disclaimers.                                                                                     |
| Malicious uploads              | Only JPEG/PNG/WebP/PDF; declared type must match magic bytes (`server/lib/fileSignature.ts`); strict base64 validation; size limits.                                                                                                                                           |
| Oversized / malformed requests | Per-route JSON body limits, Zod `strictObject` validation (unknown fields rejected), length limits on text and questions.                                                                                                                                                      |
| Abuse / quota exhaustion       | Per-IP rate limit on AI endpoints (`RATE_LIMIT_MAX`), applied before body parsing; hard AI timeouts.                                                                                                                                                                           |
| XSS                            | React escapes all output; no `dangerouslySetInnerHTML`; strict CSP (`script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`); model output validated and control characters stripped.                                                                               |
| Clickjacking / leaks           | `frame-ancestors 'none'` + `X-Frame-Options`, `Referrer-Policy: no-referrer`, `Permissions-Policy` (camera and geolocation off, microphone same-origin only), HSTS.                                                                                                            |
| Information disclosure         | Uniform JSON errors with stable codes; stack traces and upstream error details are never returned; logs contain only task, status and a short reason.                                                                                                                          |
| Vulnerable dependencies        | `npm audit` in CI; minimal production dependencies.                                                                                                                                                                                                                            |

Security behaviour is covered by tests in `server/app.test.ts`, `server/ai/geminiClient.test.ts`, `server/misc.test.ts`, `shared/redact.test.ts` and `e2e/upload-and-security.spec.ts`.

## Reporting a vulnerability

Please open a private security advisory on the repository rather than a public issue.
