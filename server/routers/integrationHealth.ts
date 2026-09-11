import { adminProcedure, router } from "../_core/trpc";
import { getIntegrationHealthSnapshot } from "../integrationHealth";

/**
 * Live, non-persistent operational probes for administrators. The contract
 * deliberately returns sanitized summaries only; it never returns credentials,
 * endpoint URLs, raw provider payloads, or customer data.
 */
export const integrationHealthRouter = router({
  snapshot: adminProcedure.query(() => getIntegrationHealthSnapshot()),
});
