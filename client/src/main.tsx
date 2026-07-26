import { trpc } from "@/lib/trpc";
import "@/lib/i18n"; // Initialize i18next before app renders
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

// ── Retry helper ──────────────────────────────────────────────────────────────
// Retries failed queries up to MAX_RETRIES times with exponential backoff.
// Skips retry for auth errors (UNAUTHORIZED / FORBIDDEN) and mutations.
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 800; // 800ms → 1.6s → 3.2s

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  if (!(error instanceof TRPCClientError)) return false;

  const code = (error.data as { code?: string } | undefined)?.code;
  // Never retry auth or permission errors
  if (code === "UNAUTHORIZED" || code === "FORBIDDEN") return false;
  // Never retry explicit "not found" — those won't change
  if (code === "NOT_FOUND") return false;

  // Retry on network errors (502/503/504) and parse errors (sandbox waking up)
  return true;
}

function retryDelay(failureCount: number): number {
  // Exponential backoff with jitter: 800ms, 1600ms, 3200ms (+ up to 200ms jitter)
  return BASE_DELAY_MS * Math.pow(2, failureCount - 1) + Math.random() * 200;
}

// ── QueryClient with retry config ─────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      retryDelay,
      // Stale time of 30s prevents unnecessary refetches on tab focus
      staleTime: 30_000,
    },
    mutations: {
      // Don't retry mutations — they may have side effects
      retry: false,
    },
  },
});

// ── Auth redirect ─────────────────────────────────────────────────────────────
const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  if (error.message === UNAUTHED_ERR_MSG) {
    window.location.href = getLoginUrl();
    return;
  }
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    // Only log after all retries exhausted (failureCount === MAX_RETRIES)
    const failureCount = event.query.state.fetchFailureCount ?? 0;
    if (failureCount >= MAX_RETRIES) {
      console.error("[API Query Error]", error);
      if (error instanceof TRPCClientError) {
        const code = (error.data as { code?: string } | undefined)?.code;
        if (code !== "UNAUTHORIZED" && code !== "FORBIDDEN") {
          import("sonner").then(({ toast }) => {
            toast.error("Something went wrong", {
              description: "A background request failed. Try refreshing if the page looks incorrect.",
              duration: 6000,
            });
          });
        }
      }
    }
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

// ── tRPC client ───────────────────────────────────────────────────────────────
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

// ── Service worker ────────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  });
}

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
