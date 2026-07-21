import type { Query, QueryClient } from "@tanstack/react-query";
import { getQueryRetryLimit } from "./queryRetry";

function retryErrorFor(query: Query): unknown {
  return query.state.fetchFailureReason ?? query.state.error;
}

/**
 * A query is actively recovering only after a transient failure and before its
 * bounded automatic retry budget has been exhausted. Initial loads and terminal
 * errors intentionally do not surface the quiet reconnecting indicator.
 */
export function isActiveTransientQueryRetry(query: Query): boolean {
  const { fetchFailureCount, fetchStatus } = query.state;
  if (fetchStatus !== "fetching" || fetchFailureCount < 1) return false;

  return fetchFailureCount < getQueryRetryLimit(retryErrorFor(query));
}

export function getActiveTransientRetryCount(queryClient: QueryClient): number {
  return queryClient
    .getQueryCache()
    .getAll()
    .filter(isActiveTransientQueryRetry).length;
}
