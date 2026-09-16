import type { ApiErrorCode } from '../../shared/schema.js';

/**
 * An error that is safe to show to the client: it carries an HTTP status, a
 * stable machine-readable code (the UI translates it) and a short English message.
 * Anything that is not an HttpError is reported to clients as a generic 500.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}
