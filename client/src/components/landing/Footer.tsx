import { useTranslation } from "react-i18next";
import SupportDialog from "./SupportDialog";

const LOGO_URL = "https://assets.getphame.app/getphame-logo-mark.webp";

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="w-full border-t border-[#1e3050] bg-[oklch(0.09_0.025_250)]">
      <div className="container">
        <div className="flex flex-col gap-7 py-8 sm:py-10 md:flex-row md:items-center md:justify-between">
          <a href="/" className="flex items-center gap-2.5 justify-center md:justify-start">
            <img src={LOGO_URL} alt="Get Phame" className="w-7 h-7" />
            <span className="font-display font-bold text-base">
              <span className="text-white">GET&nbsp;</span><span className="text-primary">PHAME</span>
            </span>
          </a>

          <div className="grid grid-cols-2 items-center justify-center gap-x-3 gap-y-1 text-center text-sm sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-3 md:justify-end">
            <a
              href="/privacy-policy"
              className="inline-flex min-h-10 items-center justify-center rounded-md px-2 text-slate-200 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017] font-medium"
            >
{t("landing.footer.privacy", { defaultValue: "Privacy" })}
            </a>
            <a
              href="/terms-of-service"
              className="inline-flex min-h-10 items-center justify-center rounded-md px-2 text-slate-200 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017] font-medium"
            >
{t("landing.footer.terms", { defaultValue: "Terms" })}
            </a>
            <a
              href="/security"
              className="inline-flex min-h-10 items-center justify-center rounded-md px-2 text-slate-200 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017] font-medium"
            >
{t("landing.footer.security", { defaultValue: "Security" })}
            </a>
            <SupportDialog />
          </div>

        </div>

        <div className="border-t border-[#1e3050] py-6">
          <p className="text-center text-sm font-medium text-slate-300">
            {t("landing.footer.copyright", {
              year: new Date().getFullYear(),
              defaultValue: "© {{year}} Get Phame. All rights reserved.",
            })}
          </p>
        </div>
      </div>
    </footer>
  );
}
