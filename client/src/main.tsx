import { trpc } from "@/lib/trpc";
import i18n from "@/lib/i18n"; // Initialize i18next before app renders
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import { apiFetch } from "./lib/apiFetch";
import { queryRetryDelay, shouldRetryQuery } from "./lib/queryRetry";
import "./index.css";

// ── Retry helper ──────────────────────────────────────────────────────────────
// Transient API/proxy failures get a longer bounded recovery window. Terminal
// 4xx errors are never retried, and mutations remain single-attempt operations.

// ── QueryClient with retry config ─────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
      retryDelay: queryRetryDelay,
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
    // Intermediate failures remain in a fetching state while React Query retries.
    if (event.query.state.fetchStatus === "idle") {
      console.error("[API Query Error]", error);
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
      fetch: apiFetch,
    }),
  ],
});

// ── Service worker ────────────────────────────────────────────────────────────
function syncLanguageToServiceWorker(registration: ServiceWorkerRegistration, language: string) {
  const worker = registration.active ?? registration.waiting ?? registration.installing;
  worker?.postMessage({ type: "SET_LANGUAGE", language });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      const syncCurrentLanguage = (language = i18n.resolvedLanguage ?? i18n.language ?? "en") => {
        syncLanguageToServiceWorker(registration, language);
      };

      syncCurrentLanguage();
      i18n.on("languageChanged", syncCurrentLanguage);
      navigator.serviceWorker.addEventListener("controllerchange", () => syncCurrentLanguage());
    }).catch(console.error);
  });
}

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
