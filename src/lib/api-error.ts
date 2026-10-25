import axios from 'axios';

export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'rate_limited'
  | 'server'
  | 'unknown';

export interface FieldError {
  field: string;
  message: string;
}

/**
 * Normalised error surfaced to the UI. Never contains stack traces, tokens
 * or raw transcripts — only a safe message and optional field errors.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly fieldErrors: FieldError[];
  /** True when the request may have reached the server but we have no confirmation. */
  readonly outcomeUnknown: boolean;
  /** True when `message` is a user-facing string written by the backend (already localised via Accept-Language). */
  readonly fromServer: boolean;

  constructor(opts: { kind: ApiErrorKind; message: string; status?: number; fieldErrors?: FieldError[]; outcomeUnknown?: boolean; fromServer?: boolean }) {
    super(opts.message);
    this.name = 'ApiError';
    this.kind = opts.kind;
    this.status = opts.status;
    this.fieldErrors = opts.fieldErrors ?? [];
    this.outcomeUnknown = opts.outcomeUnknown ?? false;
    this.fromServer = opts.fromServer ?? false;
  }
}

interface FastApiValidationItem {
  loc?: (string | number)[];
  msg?: string;
}

const SAFE_MESSAGES: Record<ApiErrorKind, string> = {
  network: 'Could not reach the server. Check your internet connection.',
  timeout: 'The server took too long to respond.',
  unauthorized: 'Your session has ended. Please sign in again.',
  forbidden: 'You do not have permission to do this.',
  not_found: 'We could not find what you were looking for.',
  validation: 'Some details need fixing.',
  conflict: 'This was changed by someone else. Refresh and try again.',
  rate_limited: 'Too many requests. Please wait a moment.',
  server: 'Something went wrong on our side. Please try again.',
  unknown: 'Something went wrong. Please try again.',
};

export function toApiError(err: unknown, opts: { mutating?: boolean } = {}): ApiError {
  if (err instanceof ApiError) return err;
  if (!axios.isAxiosError(err)) {
    return new ApiError({ kind: 'unknown', message: SAFE_MESSAGES.unknown });
  }

  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
    return new ApiError({ kind: 'timeout', message: SAFE_MESSAGES.timeout, outcomeUnknown: !!opts.mutating });
  }
  if (!err.response) {
    // Request may have been sent; for writes we cannot know whether it committed.
    return new ApiError({ kind: 'network', message: SAFE_MESSAGES.network, outcomeUnknown: !!opts.mutating && !!err.request });
  }

  const { status, data } = err.response;
  const detail = (data as { detail?: unknown } | undefined)?.detail;

  if (status === 422 && Array.isArray(detail)) {
    const fieldErrors = (detail as FastApiValidationItem[]).map((d) => ({
      field: String(d.loc?.filter((p) => p !== 'body').join('.') ?? ''),
      message: d.msg ?? 'Invalid value',
    }));
    return new ApiError({ kind: 'validation', status, message: SAFE_MESSAGES.validation, fieldErrors });
  }

  const kind: ApiErrorKind =
    status === 400 || status === 422 ? 'validation'
    : status === 401 ? 'unauthorized'
    : status === 403 ? 'forbidden'
    : status === 404 ? 'not_found'
    : status === 409 ? 'conflict'
    : status === 429 ? 'rate_limited'
    : status >= 500 ? 'server'
    : 'unknown';

  // Only surface backend `detail` strings for client errors; they are written for users.
  const fromServer = typeof detail === 'string' && status < 500 && detail.length < 300;
  const message = fromServer ? (detail as string) : SAFE_MESSAGES[kind];
  // 502/503/504 on a write: a proxy may have cut off a request the API still committed.
  return new ApiError({ kind, status, message, fromServer, outcomeUnknown: kind === 'server' && !!opts.mutating && status !== 500 });
}
