type QueryErrorData = {
  code?: string;
  httpStatus?: number;
};

type QueryErrorLike = Error & {
  data?: QueryErrorData;
};

export const DEFAULT_QUERY_RETRY_LIMIT = 3;
export const TRANSIENT_QUERY_RETRY_LIMIT = 6;

const TERMINAL_TRPC_CODES = new Set([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "METHOD_NOT_SUPPORTED",
  "CONFLICT",
  "UNPROCESSABLE_CONTENT",
]);

export function getQueryRetryLimit(error: unknown): number {
  if (!(error instanceof Error)) return 0;

  const { code, httpStatus } = (error as QueryErrorLike).data ?? {};

  if (code && TERMINAL_TRPC_CODES.has(code)) return 0;
  if (httpStatus && httpStatus >= 400 && httpStatus < 500 && httpStatus !== 408 && httpStatus !== 429) {
    return 0;
  }

  const isTransient =
    httpStatus === 408 ||
    httpStatus === 429 ||
    (typeof httpStatus === "number" && httpStatus >= 500) ||
    error.message.includes("temporarily unavailable") ||
    error.message.includes("Failed to fetch") ||
    error.message.includes("NetworkError");

  return isTransient ? TRANSIENT_QUERY_RETRY_LIMIT : DEFAULT_QUERY_RETRY_LIMIT;
}

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return failureCount < getQueryRetryLimit(error);
}

export function queryRetryDelay(failureCount: number): number {
  const exponentialDelay = 800 * Math.pow(2, Math.max(0, failureCount));
  return Math.min(exponentialDelay, 8_000) + Math.random() * 200;
}
