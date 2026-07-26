// useAppVersionCheck — listens for RELOAD_REQUIRED messages from the service worker
// and shows a persistent "New version available" toast with a tap-to-update action.
//
// Usage: call once in App.tsx (or main.tsx) at the top level.
import { useEffect } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export function useAppVersionCheck() {
  const { t } = useTranslation();
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "RELOAD_REQUIRED") {
        const version = event.data.version ?? "";
        console.log("[App] New version available:", version);
        toast(t("versionToast.title", { defaultValue: "New version available" }), {
          description: t("versionToast.description", { defaultValue: "Tap to update and get the latest features." }),
          duration: Infinity,
          className: "version-toast",
          action: {
            label: t("versionToast.action", { defaultValue: "Update now" }),
            onClick: () => {
              // Ask the SW to skip waiting, then reload
              navigator.serviceWorker.controller?.postMessage({ type: "SKIP_WAITING" });
              setTimeout(() => window.location.reload(), 300);
            },
          },
        });
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [t]);
}
