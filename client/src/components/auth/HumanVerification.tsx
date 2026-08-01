import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
          theme: "light" | "dark" | "auto";
          size: "normal" | "compact" | "flexible";
          appearance: "always" | "execute" | "interaction-only";
          execution: "render" | "execute";
        }
      ) => string;
      execute: (widgetId: string) => void | Promise<string>;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface HumanVerificationProps {
  onTokenChange: (token: string | null) => void;
}

const SCRIPT_ID = "getphame-turnstile-script";

export default function HumanVerification({
  onTokenChange,
}: HumanVerificationProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(
    "loading"
  );
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      onTokenChange(null);
      setStatus("unavailable");
      return;
    }

    let disposed = false;
    const failUnavailable = () => {
      if (disposed) return;
      onTokenChange(null);
      setStatus("unavailable");
    };
    const executeWidget = () => {
      const widgetId = widgetIdRef.current;
      if (disposed || !window.turnstile || !widgetId) return;
      try {
        const execution = window.turnstile.execute(widgetId);
        if (execution && typeof execution.catch === "function")
          void execution.catch(failUnavailable);
      } catch {
        failUnavailable();
      }
    };
    const render = () => {
      if (
        disposed ||
        !containerRef.current ||
        !window.turnstile ||
        widgetIdRef.current
      )
        return;
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "dark",
          size: "normal",
          appearance: "interaction-only",
          execution: "execute",
          callback: token => {
            if (!disposed) {
              onTokenChange(token);
              setStatus("ready");
            }
          },
          "expired-callback": () => {
            if (!disposed) {
              onTokenChange(null);
              setStatus("loading");
              const widgetId = widgetIdRef.current;
              if (!widgetId || !window.turnstile) return failUnavailable();
              try {
                window.turnstile.reset(widgetId);
                executeWidget();
              } catch {
                failUnavailable();
              }
            }
          },
          "error-callback": failUnavailable,
        });
        executeWidget();
      } catch {
        failUnavailable();
      }
    };

    const existing = document.getElementById(
      SCRIPT_ID
    ) as HTMLScriptElement | null;
    if (window.turnstile) render();
    else if (existing)
      existing.addEventListener("load", render, { once: true });
    else {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", render, { once: true });
      script.addEventListener(
        "error",
        () => {
          failUnavailable();
        },
        { once: true }
      );
      document.head.appendChild(script);
    }

    return () => {
      disposed = true;
      onTokenChange(null);
      if (widgetIdRef.current && window.turnstile)
        window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [onTokenChange, siteKey]);

  return (
    <>
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        data-testid="human-verification-status"
      >
        {status === "loading"
          ? "Preparing account security check."
          : status === "ready"
            ? "Account security check complete."
            : "Account security check is unavailable."}
      </div>
      <div
        ref={containerRef}
        className="flex justify-center"
        data-testid="human-verification-widget"
      />
    </>
  );
}
