import { useEffect } from "react";
import { getBrowserModelContext, registerPublicDiscoveryTool } from "../lib/webMcp";

/**
<<<<<<< HEAD
 * Registers one safe WebMCP tool whenever the Get Phame application is loaded
 * in a browser that implements the experimental Model Context API. The tool is
 * public and read-only: it deliberately excludes customer records, account
 * changes, imports, and review-outreach actions.
=======
 * Registers one safe WebMCP tool whenever the browser implements the
 * experimental Model Context API. It is public and deliberately read-only.
>>>>>>> origin/main
 */
export default function WebMcpPublicDiscovery() {
  useEffect(() => {
    const context = getBrowserModelContext();
    if (!context) return;

    const controller = new AbortController();
    void Promise.resolve(registerPublicDiscoveryTool(context, controller.signal)).catch(() => {
<<<<<<< HEAD
      // The API is experimental. Browser support, duplicate registration, and
      // policy restrictions must never affect the normal customer experience.
=======
      // Experimental browser support must never affect the customer experience.
>>>>>>> origin/main
    });

    return () => controller.abort();
  }, []);

  return null;
}
