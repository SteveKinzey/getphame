import { useEffect } from "react";
import { getBrowserModelContext, registerPublicDiscoveryTool } from "../lib/webMcp";

/**
 * Registers one safe WebMCP tool whenever the Get Phame application is loaded
 * in a browser that implements the experimental Model Context API. The tool is
 * public and read-only: it deliberately excludes customer records, account
 * changes, imports, and review-outreach actions.
 */
export default function WebMcpPublicDiscovery() {
  useEffect(() => {
    const context = getBrowserModelContext();
    if (!context) return;

    const controller = new AbortController();
    void Promise.resolve(registerPublicDiscoveryTool(context, controller.signal)).catch(() => {
      // The API is experimental. Browser support, duplicate registration, and
      // policy restrictions must never affect the normal customer experience.
    });

    return () => controller.abort();
  }, []);

  return null;
}
