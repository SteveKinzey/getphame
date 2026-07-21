import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getActiveTransientRetryCount } from "@/lib/apiRecoveryState";

/** Keeps UI feedback aligned with React Query's actual retry lifecycle. */
export function useActiveTransientQueryRetries(): number {
  const queryClient = useQueryClient();
  const [retryCount, setRetryCount] = useState(() => getActiveTransientRetryCount(queryClient));

  useEffect(() => {
    const update = () => setRetryCount(getActiveTransientRetryCount(queryClient));
    update();
    return queryClient.getQueryCache().subscribe(update);
  }, [queryClient]);

  return retryCount;
}
