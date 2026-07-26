import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { setLanguage, getSavedLang, type SupportedLang } from "@/lib/i18n";
import i18n from "@/lib/i18n";

const LOGO_URL = "https://assets.getphame.app/getphame-logo-mark.webp";

const LANGS: { code: SupportedLang; label: string }[] = [
  { code: "en",    label: "EN" },
  { code: "th",    label: "TH" },
  { code: "zh-CN", label: "CN" },
  { code: "fr",    label: "FR" },
  { code: "es",    label: "ES" },
  { code: "it",    label: "IT" },
];

export default function Navbar() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [activeLang, setActiveLang] = useState<SupportedLang>(() => (getSavedLang() ?? "en") as SupportedLang);

  // Keep in sync with i18n changes
  useEffect(() => {
    const handler = (lng: string) => { if (LANGS.some(l => l.code === lng)) setActiveLang(lng as SupportedLang); };
    i18n.on("languageChanged", handler);
    return () => { i18n.off("languageChanged", handler); };
  }, []);

  const handleLangSelect = (code: SupportedLang) => {
    setLanguage(code);
    setActiveLang(code);
    setLangOpen(false);
  };

  const navLinks = [
    { label: t("nav.howItWorks"), href: "#how-it-works" },
    { label: t("nav.product"), href: "#product" },
    { label: t("nav.pricing"), href: "#pricing" },
    { label: t("nav.faq"), href: "#faq" },
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Determine if we're on the home page (for anchor links)
  const isHomePage = typeof window !== "undefined" && (window.location.pathname === "/" || window.location.pathname === "");

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[oklch(0.12_0.03_250/0.95)] backdrop-blur-xl border-b border-[#1e3050] shadow-lg shadow-black/10"
          : "bg-transparent"
      }`}
    >
      <nav className="container flex items-center justify-between h-16 lg:h-[4.5rem]">
        {/* Logo — prominent brand mark */}
        <a href="/" className="flex items-center gap-2.5 group">
          <img src={LOGO_URL} alt="Get Phame" className="w-9 h-9 lg:w-10 lg:h-10 transition-transform duration-200 group-hover:scale-105" />
          <div className="flex items-baseline gap-1">
            <span className="font-display font-extrabold text-xl lg:text-[1.4rem] tracking-tight text-white">
              GET
            </span>
            <span className="font-display font-extrabold text-xl lg:text-[1.4rem] tracking-[0.08em] text-primary">
              PHAME
            </span>
          </div>
        </a>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-5 xl:gap-7">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={isHomePage ? link.href : `/${link.href}`}
              className="text-sm font-medium text-slate-200 hover:text-white transition-colors duration-200 relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-primary after:transition-all after:duration-200 hover:after:w-full"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center gap-2.5 xl:gap-4">
          {/* Compact language picker */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium"
            >
              <Globe size={14} />
              <span>{activeLang.toUpperCase().replace("-CN", "")}</span>
            </button>
            {langOpen && (
              <div
                className="absolute right-0 top-full mt-1 rounded-xl shadow-xl border border-white/10 py-1 z-50 min-w-[100px]"
                style={{ background: "oklch(0.15 0.04 260)" }}
                onMouseLeave={() => setLangOpen(false)}
              >
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => handleLangSelect(l.code)}
                    className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                      activeLang === l.code
                        ? "text-yellow-400 font-bold"
                        : "text-slate-300 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <a
            href="/onboarding"
            className="text-base font-semibold text-slate-200 hover:text-white transition-colors"
          >
            {t("nav.signIn")}
          </a>
          <a
            href="/onboarding"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:brightness-110 transition-all duration-200 active:scale-[0.97] shadow-[0_0_15px_oklch(0.78_0.15_75/0.2)]"
          >
            {t("nav.getStartedFree")}
          </a>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 text-white"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-[oklch(0.12_0.03_250/0.98)] backdrop-blur-xl border-t border-[#1e3050]">
          <div className="container py-4 flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={isHomePage ? link.href : `/${link.href}`}
                onClick={() => setMobileOpen(false)}
                className="text-lg font-bold text-white py-2.5 transition-colors"
              >
                {link.label}
              </a>
            ))}
            <hr className="border-[#1e3050] my-2" />
            <div className="flex items-center gap-3 py-1.5">
              <span className="text-sm font-medium text-slate-300">Language</span>
              <div className="flex flex-wrap gap-2">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => handleLangSelect(l.code)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                      activeLang === l.code
                        ? "bg-yellow-400 text-black"
                        : "bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <hr className="border-[#1e3050] my-1" />
            <a
              href="/onboarding"
              className="text-lg font-bold text-white py-2.5"
            >
              {t("nav.signIn")}
            </a>
            <a
              href="/onboarding"
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-primary text-primary-foreground font-semibold text-base rounded-xl mt-2"
            >
              {t("nav.getStartedFree")}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
