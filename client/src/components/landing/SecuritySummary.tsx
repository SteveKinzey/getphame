import {
  ArrowRight,
  Database,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import FadeUp from "./FadeUp";

export default function SecuritySummary() {
  const { t } = useTranslation();

  const securityItems = [
    {
      id: "no-selling",
      icon: EyeOff,
      title: t("landing.securitySummary.noSelling.title", {
        defaultValue: "We do not sell your data",
      }),
      description: t("landing.securitySummary.noSelling.description", {
        defaultValue:
          "Your account and customer information are used to run Get Phame—not for advertising or resale.",
      }),
    },
    {
      id: "minimal-data",
      icon: Database,
      title: t("landing.securitySummary.minimalData.title", {
        defaultValue: "We collect only what we need",
      }),
      description: t("landing.securitySummary.minimalData.description", {
        defaultValue:
          "Google sign-in shares only your name and email. We do not read your inbox, contacts, Drive files, or Calendar.",
      }),
    },
    {
      id: "sensitive-details",
      icon: LockKeyhole,
      title: t("landing.securitySummary.protected.title", {
        defaultValue: "Sensitive details are protected",
      }),
      description: t("landing.securitySummary.protected.description", {
        defaultValue:
          "Your connected-email password is encrypted before storage, and your connection to Get Phame is protected with HTTPS.",
      }),
    },
    {
      id: "account-protection",
      icon: ShieldCheck,
      title: t("landing.securitySummary.account.title", {
        defaultValue: "Your account is protected",
      }),
      description: t("landing.securitySummary.account.description", {
        defaultValue:
          "Secure sign-in sessions, access controls, rate limits, abuse checks, and continuous vulnerability monitoring help protect the service.",
      }),
    },
  ];

  return (
    <section
      id="privacy-and-security"
      aria-labelledby="privacy-and-security-title"
      className="bg-[#0a1628] py-20 md:py-28"
    >
      <div className="container">
        <FadeUp>
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
              {t("landing.securitySummary.eyebrow", {
                defaultValue: "Privacy & Security",
              })}
            </p>
            <h2
              id="privacy-and-security-title"
              className="font-display text-3xl font-bold text-white md:text-4xl"
            >
              {t("landing.securitySummary.title", {
                defaultValue: "Your customer data stays yours",
              })}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-slate-200 md:text-lg">
              {t("landing.securitySummary.description", {
                defaultValue:
                  "Get Phame uses only the information needed to send review requests, never sells your data, and protects sensitive details with modern safeguards.",
              })}
            </p>
          </div>
        </FadeUp>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {securityItems.map(
            ({ id, icon: Icon, title, description }, index) => (
              <FadeUp key={id} delay={index * 0.08}>
                <article className="h-full rounded-2xl border border-[#1e3050] bg-[#0f1d32] p-6 transition-all duration-300 hover:border-primary/25 hover:shadow-[0_0_40px_oklch(0.78_0.15_75/0.06)]">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon size={22} aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-lg font-bold leading-6 text-white">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-300">
                    {description}
                  </p>
                </article>
              </FadeUp>
            )
          )}
        </div>

        <FadeUp delay={0.22}>
          <div className="mt-10 text-center">
            <a
              href="/security"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-primary/45 bg-primary/10 px-6 py-3 text-sm font-extrabold text-primary transition-colors duration-200 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1628]"
            >
              {t("landing.securitySummary.cta", {
                defaultValue: "See how Get Phame protects your data",
              })}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
