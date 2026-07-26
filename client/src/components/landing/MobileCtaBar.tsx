// MobileCtaBar — sticky bottom CTA bar shown only on mobile (hidden at lg+).
// Appears after the user scrolls past the hero section (200px).
// Uses getLoginUrl() to build the OAuth URL, same as Hero.tsx.
import { useState, useEffect } from "react";
import { getLoginUrl } from "@/const";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function MobileCtaBar() {
  const { t } = useTranslation();
  const [loginUrl, setLoginUrl] = useState("#");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setLoginUrl(getLoginUrl("/home"));
  }, []);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 200);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-40 lg:hidden
        transition-transform duration-300 ease-out
        ${visible ? "translate-y-0" : "translate-y-full"}
      `}
      style={{
        background: "linear-gradient(to top, oklch(0.10 0.05 260) 0%, oklch(0.10 0.05 260 / 0.95) 100%)",
        borderTop: "1px solid oklch(0.80 0.18 80 / 0.3)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="px-4 py-3">
        <a
          href={loginUrl}
          className="flex items-center justify-center gap-2 w-full rounded-xl h-12 font-bold text-sm active:scale-[0.97] transition-transform duration-150"
          style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)" }}
        >
          {t("hero.cta", { defaultValue: "Get Your First 10 Reviews Free" })}
          <ArrowRight size={16} />
        </a>
        <p className="text-center text-xs mt-1.5" style={{ color: "oklch(0.80 0.18 80 / 0.7)" }}>
          {t("hero.noCard", { defaultValue: "Free to start — No credit card required" })}
        </p>
      </div>
    </div>
  );
}

