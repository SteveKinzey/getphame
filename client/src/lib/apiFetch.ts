const JSON_CONTENT_TYPE = /application\/(?:[a-z0-9.+-]+\+)?json/i;

function getRequestPath(input: RequestInfo | URL): string {
  try {
    const rawUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    const baseUrl =
      typeof window !== "undefined" ? window.location.origin : "http://localhost";
    return new URL(rawUrl, baseUrl).pathname;
  } catch {
    return "/api/trpc";
  }
}

/**
 * Fetch wrapper for tRPC requests.
 *
 * API traffic explicitly asks for JSON so Vite's SPA fallback is never a valid
 * response. If an upstream preview/proxy still returns HTML while the server is
 * restarting, convert it to a valid tRPC error envelope. Queries can then use
 * React Query's retry policy instead of failing with an HTML JSON parse error.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("accept", "application/json");

  const response = await fetchImpl(input, {
    ...(init ?? {}),
    credentials: "include",
    headers,
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (response.status === 204 || JSON_CONTENT_TYPE.test(contentType)) {
    return response;
  }

  const path = getRequestPath(input);
  console.warn(
    `[API Transport] Expected JSON for ${path}, received ${contentType || "an unknown content type"}.`
  );

  return new Response(
    JSON.stringify([
      {
        error: {
          json: {
            message: "The API is temporarily unavailable. Please try again.",
            code: -32603,
            data: {
              code: "INTERNAL_SERVER_ERROR",
              httpStatus: 503,
              path,
            },
          },
        },
      },
    ]),
    {
      status: 503,
      statusText: "Service Unavailable",
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    }
  );
}
