import { ArrowRight, Building2, MailCheck, ShieldCheck, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

const workflow = [
  { key: "customers", icon: Users },
  { key: "send", icon: MailCheck },
  { key: "reviews", icon: ArrowRight },
] as const;

export default function AppPurpose() {
  const { t } = useTranslation();

  return (
    <section
      id="about-getphame"
      aria-labelledby="about-getphame-title"
      className="relative bg-white py-16 text-[#0a1628] md:py-20"
    >
      <div className="container">
        <div className="grid gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-stretch">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm md:p-9">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.14em] text-[#806000]">
              <Building2 size={16} aria-hidden="true" />
              {t("landing.purpose.eyebrow", { defaultValue: "About this app" })}
            </div>

            <h2
              id="about-getphame-title"
              className="font-display text-3xl font-extrabold leading-tight text-[#0a1628] md:text-4xl"
            >
              {t("landing.purpose.title", { defaultValue: "What Get Phame does" })}
            </h2>

            <p className="mt-5 max-w-3xl text-base font-medium leading-7 text-slate-700 md:text-lg">
              {t("landing.purpose.description", {
                defaultValue:
                  "Get Phame helps local businesses send personalized review-request emails from their own connected email account. It is built for business owners, photographers, cafés and restaurants, home-service teams, clinics and salons, agencies, and WooCommerce stores that want a simpler way to ask real customers for feedback.",
              })}
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {workflow.map(({ key, icon: Icon }, index) => (
                <div
                  key={key}
                  tabIndex={0}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm outline-none transition-[transform,box-shadow,border-color] duration-200 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:border-primary/55 motion-safe:hover:shadow-[0_14px_34px_rgba(10,22,40,0.12)] motion-safe:focus-visible:-translate-y-1 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/35 motion-reduce:transform-none motion-reduce:transition-none"
                >
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-primary transition-transform duration-200 ease-out motion-safe:group-hover:scale-x-100 motion-safe:group-focus-visible:scale-x-100 motion-reduce:hidden" />
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#0a1628] text-primary transition-[transform,background-color,color] duration-200 ease-out motion-safe:group-hover:scale-110 motion-safe:group-hover:bg-primary motion-safe:group-hover:text-[#0a1628] motion-safe:group-focus-visible:scale-110 motion-safe:group-focus-visible:bg-primary motion-safe:group-focus-visible:text-[#0a1628] motion-reduce:transform-none motion-reduce:transition-none">
                    <Icon
                      size={18}
                      aria-hidden="true"
                      className="transition-transform duration-200 ease-out motion-safe:group-hover:rotate-[-6deg] motion-safe:group-focus-visible:rotate-[-6deg] motion-reduce:transform-none motion-reduce:transition-none"
                    />
                  </div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#806000]">
                    {t("landing.purpose.stepLabel", { defaultValue: "Step {{number}}", number: index + 1 })}
                  </p>
                  <p className="mt-1 text-sm font-bold leading-5 text-[#0a1628]">
                    {t(`landing.purpose.steps.${key}`, {
                      defaultValue:
                        key === "customers"
                          ? "Add the customers you choose"
                          : key === "send"
                            ? "Send a personal request from your email"
                            : "Direct customers to your selected review platform",
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <aside
            aria-labelledby="google-sign-in-use-title"
            className="rounded-3xl border border-primary/35 bg-[#0a1628] p-6 text-white shadow-[0_22px_70px_rgba(10,22,40,0.18)] md:p-9"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-[#0a1628]">
              <ShieldCheck size={24} aria-hidden="true" />
            </div>
            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-primary">
              {t("landing.purpose.googleEyebrow", { defaultValue: "Google sign-in disclosure" })}
            </p>
            <h3 id="google-sign-in-use-title" className="mt-2 font-display text-2xl font-extrabold text-white md:text-3xl">
              {t("landing.purpose.googleTitle", { defaultValue: "How Google sign-in is used" })}
            </h3>
            <p className="mt-5 text-base font-medium leading-7 text-slate-200">
              {t("landing.purpose.googleDescription", {
                defaultValue:
                  "Google sign-in is used only to create and identify your Get Phame account. With your permission, Get Phame receives your name and email address. We do not request access to your Gmail messages, contacts, Google Drive files, or Google Calendar.",
              })}
            </p>
            <p className="mt-4 text-sm font-medium leading-6 text-slate-300">
              {t("landing.purpose.googleSendingNote", {
                defaultValue:
                  "Review-request sending is configured separately inside the app using an email account you choose to connect.",
              })}
            </p>
            <a
              href="/privacy-policy"
              className="mt-7 inline-flex items-center gap-2 rounded-xl border border-primary/45 bg-primary/10 px-5 py-3 text-sm font-extrabold text-primary transition-colors duration-200 hover:bg-primary/15"
            >
              {t("landing.purpose.privacyLink", { defaultValue: "Read our Privacy Policy" })}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </aside>
        </div>
      </div>
    </section>
  );
}
