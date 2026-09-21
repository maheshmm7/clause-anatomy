import type { ErrorRequestHandler, RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import type { z } from 'zod';
import type { ApiErrorBody } from '../../shared/schema.js';
import { HttpError } from '../lib/httpError.js';

/**
 * Security headers. The CSP only allows same-origin scripts, styles, workers
 * (pdf.js) and API calls; images may come from blob:/data: URLs created locally
 * for photo previews. Camera access is not needed (the OS picker is used) and
 * the microphone is limited to this origin for voice questions.
 */
export function securityHeaders(): RequestHandler {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'"],
        'img-src': ["'self'", 'data:', 'blob:'],
        'worker-src': ["'self'", 'blob:'],
        'connect-src': ["'self'"],
        'object-src': ["'none'"],
        'frame-ancestors': ["'none'"],
        'form-action': ["'self'"],
        'base-uri': ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'no-referrer' },
  });
}

/** Stops browsers and proxies from storing documents or AI answers. */
export const noStore: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
};

export const permissionsPolicy: RequestHandler = (_req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=(self), payment=()');
  next();
};

/** Per-IP limit on AI-backed endpoints: protects the API quota and prevents abuse. */
export function aiRateLimit(limit: number): RequestHandler {
  return rateLimit({
    windowMs: 10 * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new HttpError(429, 'rate_limited', 'Too many requests. Please wait a few minutes.'));
    },
  });
}

/**
 * Refuses state-changing requests sent from other websites (cross-site request forgery
 * and quota theft through a visitor's browser). Browsers label every such request with
 * `Origin` and `Sec-Fetch-Site`; requests without them do not come from a web page
 * and still face validation and the rate limit.
 */
export const sameOriginOnly: RequestHandler = (req, _res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    next();
    return;
  }
  const origin = req.get('origin');
  const host = req.get('x-forwarded-host') ?? req.get('host');
  let crossSite = req.get('sec-fetch-site') === 'cross-site';
  if (origin !== undefined) {
    try {
      crossSite ||= new URL(origin).host !== host;
    } catch {
      crossSite = true; // e.g. "null" from sandboxed frames
    }
  }
  if (crossSite) {
    next(new HttpError(403, 'forbidden', 'Requests from other websites are not allowed.'));
    return;
  }
  next();
};

/** Validates `req.body` against a schema and replaces it with the parsed (trimmed) value. */
export function validateBody<T>(schema: z.ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fields = [
        ...new Set(result.error.issues.map((issue) => issue.path.join('.') || 'body')),
      ];
      next(new HttpError(400, 'invalid_input', `Invalid request: check ${fields.join(', ')}.`));
      return;
    }
    req.body = result.data;
    next();
  };
}

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new HttpError(404, 'not_found', 'Not found.'));
};

interface BodyParserError {
  type?: string;
  status?: number;
}

function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) return error;
  const parserError = error as BodyParserError;
  if (parserError?.type === 'entity.too.large') {
    return new HttpError(413, 'payload_too_large', 'The document is too large.');
  }
  if (parserError?.type === 'entity.parse.failed' || parserError?.type === 'encoding.unsupported') {
    return new HttpError(400, 'invalid_input', 'The request body is not valid JSON.');
  }
  if (parserError?.status === 415 || parserError?.type === 'charset.unsupported') {
    return new HttpError(415, 'invalid_input', 'Unsupported request format.');
  }
  return new HttpError(500, 'internal', 'Something went wrong. Please try again.');
}

/** Converts every error to the public JSON shape without leaking stack traces or internals. */
export function errorHandler(logger: Pick<Console, 'error'> = console): ErrorRequestHandler {
  return (error: unknown, _req, res, _next) => {
    const httpError = toHttpError(error);
    if (httpError.status >= 500 && !(error instanceof HttpError)) {
      logger.error('[server] unexpected error', error instanceof Error ? error.name : typeof error);
    }
    const body: ApiErrorBody = { error: { code: httpError.code, message: httpError.message } };
    res.status(httpError.status).json(body);
  };
}
