import { useTranslation } from "react-i18next";

const LOGO_URL = "https://assets.getphame.app/getphame-logo.svg";

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="py-12 border-t border-[#1e3050]">
      <div className="container">
        {/* 3-column grid: logo | links (dead-center) | copyright */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6">
          {/* Logo — left column */}
          <a href="/" className="flex items-center gap-2.5 justify-center md:justify-start">
            <img src={LOGO_URL} alt="Get Phame" className="w-7 h-7" />
            <span className="font-display font-bold text-base">
              <span className="text-white">GET&nbsp;</span><span className="text-primary">PHAME</span>
            </span>
          </a>

          {/* Links — middle column, always dead-center */}
          <div className="flex items-center justify-center gap-6 text-sm">
            <a
              href="/privacy-policy"
              className="text-slate-200 hover:text-white transition-colors font-medium"
            >
{t("landing.footer.privacy", { defaultValue: "Privacy" })}
            </a>
            <a
              href="/terms-of-service"
              className="text-slate-200 hover:text-white transition-colors font-medium"
            >
{t("landing.footer.terms", { defaultValue: "Terms" })}
            </a>
            <a
              href="/security"
              className="text-slate-200 hover:text-white transition-colors font-medium"
            >
{t("landing.footer.security", { defaultValue: "Security" })}
            </a>
            <a
              href="mailto:support@getphame.app"
              className="text-slate-200 hover:text-white transition-colors font-medium"
            >
{t("landing.footer.support", { defaultValue: "Support" })}
            </a>
          </div>

          {/* Copyright — right column */}
          <p className="text-sm text-slate-300 font-medium text-center md:text-right">
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
