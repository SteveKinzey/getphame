import { useEffect } from "react";
import { getBrowserModelContext, registerPublicDiscoveryTool } from "../lib/webMcp";

/**
 * Registers one safe WebMCP tool whenever the browser implements the
 * experimental Model Context API. It is public and deliberately read-only.
 */
export default function WebMcpPublicDiscovery() {
  useEffect(() => {
    const context = getBrowserModelContext();
    if (!context) return;

    const controller = new AbortController();
    void Promise.resolve(registerPublicDiscoveryTool(context, controller.signal)).catch(() => {
      // Experimental browser support must never affect the customer experience.
    });

    return () => controller.abort();
  }, []);

  return null;
}
