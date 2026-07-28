import { useEffect, useSyncExternalStore } from "react";
import { BarChart3, BellRing, Languages, Mail, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LANGUAGE_OPTIONS, isSupportedLanguage } from "@/lib/languageOptions";
import {
  FIRST_VISIT_WELCOME_STORAGE_KEY,
  shouldShowFirstVisitWelcome,
} from "@/lib/firstVisitWelcome";
import { setLanguage, type SupportedLang } from "@/lib/i18n";
import {
  getPwaInstallServerSnapshot,
  getPwaInstallSnapshot,
  subscribeToPwaInstall,
  updatePwaInstallSnapshot,
} from "@/lib/pwaInstall";

let welcomeSeenInMemory = false;

function hasSeenWelcome(): boolean {
  if (welcomeSeenInMemory) return true;
  try {
    return window.localStorage.getItem(FIRST_VISIT_WELCOME_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberWelcome(): void {
  welcomeSeenInMemory = true;
  try {
    window.localStorage.setItem(FIRST_VISIT_WELCOME_STORAGE_KEY, "1");
  } catch {
    // The in-memory guard still prevents repeat display during this page session.
  }
}

export default function FirstVisitWelcome() {
  const { t, i18n } = useTranslation("translation");
  const pwaState = useSyncExternalStore(
    subscribeToPwaInstall,
    getPwaInstallSnapshot,
    getPwaInstallServerSnapshot,
  );
  const open = pwaState.welcomeVisible;
  const pathname = window.location.pathname;
  const resolvedLanguage = i18n.resolvedLanguage ?? i18n.language;
  const activeLanguage: SupportedLang = isSupportedLanguage(resolvedLanguage)
    ? resolvedLanguage
    : "en";
  const activeOption = LANGUAGE_OPTIONS.find((language) => language.code === activeLanguage)
    ?? LANGUAGE_OPTIONS[0];

  useEffect(() => {
    if (!shouldShowFirstVisitWelcome({
      pathname,
      alreadySeen: hasSeenWelcome(),
      installGuideVisible: pwaState.installGuideVisible,
    })) {
      if (open) updatePwaInstallSnapshot({ welcomeVisible: false });
      return;
    }

    const timer = window.setTimeout(() => {
      updatePwaInstallSnapshot({ welcomeVisible: true });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [open, pathname, pwaState.installGuideVisible]);

  useEffect(() => () => {
    updatePwaInstallSnapshot({ welcomeVisible: false });
  }, []);

  const dismiss = () => {
    rememberWelcome();
    updatePwaInstallSnapshot({ welcomeVisible: false });
  };

  const handleLanguageChange = (language: SupportedLang) => {
    setLanguage(language);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) dismiss();
    }}>
      <DialogContent
        data-testid="first-visit-welcome"
        showCloseButton={false}
        className="max-h-[calc(100dvh-1.5rem)] max-w-[calc(100%-1rem)] gap-0 overflow-y-auto rounded-3xl border-white/15 bg-navy p-0 text-white motion-reduce:animate-none sm:max-w-xl"
      >
        <div className="relative overflow-hidden px-5 pb-5 pt-6 sm:px-7 sm:pb-6 sm:pt-7">
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-amber-300/15 blur-3xl" aria-hidden="true" />
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("firstVisitWelcome.closeLabel")}
            className="absolute right-4 top-4 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-[transform,background-color] duration-150 active:scale-[0.97] motion-reduce:transition-none"
          >
            <X size={18} aria-hidden="true" />
          </button>

          <div className="mb-5 flex items-center gap-2 pr-12" aria-label="GET PHAME" translate="no">
            <img
              src="https://assets.getphame.app/getphame-logo.svg"
              alt=""
              className="h-9 w-9 rounded-xl"
            />
            <span className="text-sm font-black tracking-[0.16em] text-white">GET <span className="rr-text-gold">PHAME</span></span>
          </div>

          <DialogHeader className="gap-3 text-left">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200/25 bg-amber-200/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] rr-text-gold">
              <Languages size={15} aria-hidden="true" />
              {t("firstVisitWelcome.languageReady")}
            </div>
            <DialogTitle className="max-w-lg text-2xl font-black leading-tight text-white sm:text-3xl">
              {t("firstVisitWelcome.title")}
            </DialogTitle>
            <DialogDescription className="max-w-lg text-base font-semibold leading-relaxed text-white/80">
              {t("firstVisitWelcome.description", { language: activeOption.native })}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 grid gap-2.5" aria-label={t("firstVisitWelcome.featuresLabel")}>
            <WelcomeFeature icon={<Mail size={18} aria-hidden="true" />} text={t("firstVisitWelcome.features.personalRequests")} />
            <WelcomeFeature icon={<BellRing size={18} aria-hidden="true" />} text={t("firstVisitWelcome.features.followUps")} />
            <WelcomeFeature icon={<BarChart3 size={18} aria-hidden="true" />} text={t("firstVisitWelcome.features.dashboard")} />
          </div>

          <div className="mt-5 rounded-2xl border border-white/15 bg-white/[0.07] p-4">
            <label htmlFor="first-visit-language" className="mb-2 block text-sm font-black text-white">
              {t("firstVisitWelcome.changeLanguage")}
            </label>
            <select
              id="first-visit-language"
              value={activeLanguage}
              onChange={(event) => handleLanguageChange(event.target.value as SupportedLang)}
              aria-describedby="first-visit-language-status"
              className="min-h-12 w-full rounded-xl border border-white/20 bg-white px-3 py-2 text-base font-black text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              {LANGUAGE_OPTIONS.map((language) => (
                <option key={language.code} value={language.code} translate="no">
                  {language.flag} {language.native}
                </option>
              ))}
            </select>
            <p id="first-visit-language-status" className="mt-2 text-sm font-semibold text-white/70" aria-live="polite">
              {t("firstVisitWelcome.selectedLanguage", { language: activeOption.native })}
            </p>
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="mt-5 flex min-h-12 w-full items-center justify-center rounded-2xl px-5 py-3 text-base font-black rr-bg-gold rr-text-navy transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none"
          >
            {t("firstVisitWelcome.continue", { language: activeOption.native })}
          </button>
          <p className="mt-3 text-center text-xs font-semibold leading-relaxed text-white/55">
            {t("firstVisitWelcome.preferenceHint")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WelcomeFeature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/[0.07] px-3.5 py-3 text-sm font-bold leading-snug text-white">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-amber-200/10 rr-text-gold">
        {icon}
      </span>
      <span>{text}</span>
    </div>
  );
}
