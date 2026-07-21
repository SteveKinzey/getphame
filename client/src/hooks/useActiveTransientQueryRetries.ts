import { useCallback, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getActiveTransientRetryCount } from "@/lib/apiRecoveryState";

/**
 * Keeps UI feedback aligned with React Query's actual retry lifecycle.
 *
 * Query-cache notifications can occur synchronously while another query owner
 * is rendering. `useSyncExternalStore` gives React ownership of those updates,
 * avoiding a sibling component state update during render.
 */
export function useActiveTransientQueryRetries(): number {
  const queryClient = useQueryClient();
  const subscribe = useCallback(
    (onStoreChange: () => void) => queryClient.getQueryCache().subscribe(onStoreChange),
    [queryClient],
  );
  const getSnapshot = useCallback(
    () => getActiveTransientRetryCount(queryClient),
    [queryClient],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
