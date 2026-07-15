import { useEffect, useState, useSyncExternalStore } from "react";
import { Clock3, Download, Smartphone, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import {
  getPwaInstallServerSnapshot,
  getPwaInstallSnapshot,
  requestPwaInstall,
  subscribeToPwaInstall,
} from "@/lib/pwaInstall";

const DISMISS_KEY = "getphame:home-install-banner-dismissed:v1";
const REMIND_UNTIL_KEY = "getphame:home-install-banner-remind-until:v1";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function wasBannerDismissed() {
  if (typeof window === "undefined") return false;

  try {
    if (window.sessionStorage.getItem(DISMISS_KEY) === "1") return true;

    const remindUntil = Number(window.localStorage.getItem(REMIND_UNTIL_KEY));
    if (Number.isFinite(remindUntil) && remindUntil > Date.now()) return true;
    if (remindUntil) window.localStorage.removeItem(REMIND_UNTIL_KEY);
  } catch {
    // Storage can be unavailable in private or restricted browsing contexts.
  }
  return false;
}

function rememberBannerDismissal() {
  try {
    window.sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Storage can be unavailable in private or restricted browsing contexts.
  }
}

function rememberBannerForLater() {
  try {
    window.localStorage.setItem(REMIND_UNTIL_KEY, String(Date.now() + ONE_WEEK_MS));
  } catch {
    // The local component state still hides the banner for this view.
  }
}

export default function HomeInstallBanner() {
  const { t } = useTranslation();
  const installState = useSyncExternalStore(
    subscribeToPwaInstall,
    getPwaInstallSnapshot,
    getPwaInstallServerSnapshot,
  );
  const [dismissed, setDismissed] = useState(wasBannerDismissed);
  const [opening, setOpening] = useState(false);
  const trackPwaEvent = trpc.analytics.trackPwaEvent.useMutation();

  const analyticsPlatform = installState.platform === "other" ? "unknown" as const : installState.platform;
  const visible = installState.eligible && !installState.installed && !dismissed;

  useEffect(() => {
    if (!visible) return;
    trackPwaEvent.mutate({ event: "install_banner_viewed", platform: analyticsPlatform });
    // Track once per visible banner lifecycle, not on mutation-client identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, analyticsPlatform]);

  if (!visible) return null;

  const dismiss = () => {
    rememberBannerDismissal();
    setDismissed(true);
    trackPwaEvent.mutate({ event: "install_banner_dismissed", platform: analyticsPlatform });
  };

  const remindLater = () => {
    rememberBannerForLater();
    setDismissed(true);
    trackPwaEvent.mutate({ event: "install_banner_remind_later", platform: analyticsPlatform });
  };

  const openInstall = async () => {
    setOpening(true);
    trackPwaEvent.mutate({ event: "install_banner_clicked", platform: analyticsPlatform });
    try {
      await requestPwaInstall();
    } finally {
      setOpening(false);
    }
  };

  return (
    <section
      aria-labelledby="home-install-banner-title"
      className="home-install-banner-enter relative overflow-hidden rounded-2xl border px-4 py-4 shadow-sm sm:px-5"
      style={{ background: "linear-gradient(135deg, oklch(0.22 0.09 260), oklch(0.30 0.11 260))", borderColor: "oklch(0.80 0.18 80 / 0.55)" }}
      data-testid="home-install-banner"
    >
      <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full" style={{ background: "oklch(0.80 0.18 80 / 0.10)" }} aria-hidden="true" />
      <div className="relative flex items-start gap-3 sm:items-center">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl rr-bg-gold rr-text-navy" aria-hidden="true">
          <Smartphone size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p id="home-install-banner-title" className="text-base font-black text-white">
            {t("pwaInstallBanner.title", { defaultValue: "Install Get Phame" })}
          </p>
          <p className="mt-0.5 text-xs font-semibold leading-relaxed text-white/75 sm:text-sm">
            {t("pwaInstallBanner.description", { defaultValue: "Open your review dashboard faster and use Get Phame like an app." })}
          </p>
          <div className="mt-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={openInstall}
              disabled={opening}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black rr-bg-gold rr-text-navy transition-transform duration-150 active:scale-[0.97] disabled:cursor-wait disabled:opacity-70"
            >
              <Download size={16} aria-hidden="true" />
              {opening
                ? t("pwaInstallBanner.opening", { defaultValue: "Opening…" })
                : installState.platform === "ios"
                  ? t("pwaInstallBanner.iosCta", { defaultValue: "Show iPhone steps" })
                  : t("pwaInstallBanner.cta", { defaultValue: "Install App" })}
            </button>
            <button
              type="button"
              onClick={remindLater}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017]"
            >
              <Clock3 size={15} className="text-[#D4A017]" aria-hidden="true" />
              {t("pwaInstallBanner.remindLater", { defaultValue: "Remind me later" })}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("pwaInstallBanner.dismiss", { defaultValue: "Dismiss install banner" })}
          className="shrink-0 rounded-lg p-2 text-white/65 transition-colors hover:text-white"
        >
          <X size={17} />
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {opening ? t("pwaInstallBanner.openingStatus", { defaultValue: "Opening the Get Phame installation options." }) : ""}
      </p>
    </section>
  );
}
