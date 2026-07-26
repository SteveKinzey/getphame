import { useTranslation } from "react-i18next";

const LOGO_URL = "https://assets.getphame.app/getphame-logo-mark.webp";
export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="py-12 border-t border-[#1e3050]">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5">
            <img src={LOGO_URL} alt="Get Phame" className="w-7 h-7" />
            <span className="font-display font-bold text-base text-white">
              GET <span className="text-primary">PHAME</span>
            </span>
          </a>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm">
            <a
              href="/privacy-policy"
              className="text-slate-200 hover:text-white transition-colors font-medium"
            >
              {t("footer.privacy", { defaultValue: "Privacy" })}
            </a>
            <a
              href="/terms-of-service"
              className="text-slate-200 hover:text-white transition-colors font-medium"
            >
              {t("footer.terms", { defaultValue: "Terms" })}
            </a>
            <a
              href="/security"
              className="text-slate-200 hover:text-white transition-colors font-medium"
            >
              Security
            </a>
            <a
              href="mailto:support@getphame.app"
              className="text-slate-200 hover:text-white transition-colors font-medium"
            >
              {t("footer.support", { defaultValue: "Support" })}
            </a>
          </div>

          {/* Copyright */}
          <p className="text-sm text-slate-300 font-medium">
            © {new Date().getFullYear()} Get Phame. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
