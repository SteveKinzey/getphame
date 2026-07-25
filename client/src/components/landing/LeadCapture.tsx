import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Mail, ArrowRight, Check, Download, Loader2, Pencil, RotateCw, Twitter, Linkedin } from "lucide-react";
import FadeUp from "./FadeUp";
import { trpc } from "@/lib/trpc";
import { buildGuideShareUrls, validateLeadEmail } from "@/lib/leadCapture";

export default function LeadCapture() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<{ providerAccepted: boolean; downloadUrl: string } | null>(null);
  const validation = validateLeadEmail(email);
  const showEmailError = emailTouched && validation.error !== null;
  const shareUrls = buildGuideShareUrls();

  const submitLead = trpc.leadCapture.submit.useMutation({
    onSuccess: (result) => {
      setSubmitted(true);
      setSubmittedEmail(validation.normalized);
      setDelivery({ providerAccepted: result.providerAccepted, downloadUrl: result.downloadUrl });
      setError(null);
    },
    onError: (err) => {
      setSubmitted(false);
      setError(err.message || t("landing.leadCapture.errorMessage", { defaultValue: "Something went wrong. Please try again." }));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    if (validation.error) return;
    setError(null);
    submitLead.mutate({ email: validation.normalized });
  };

  const handleRetry = () => {
    if (!submittedEmail) return;
    setError(null);
    submitLead.mutate({ email: submittedEmail });
  };

  const handleEditEmail = () => {
    setSubmitted(false);
    setDelivery(null);
    setError(null);
    setEmailTouched(true);
  };

  const emailErrorMessage = validation.error === "required"
    ? t("landing.leadCapture.emailRequired", { defaultValue: "Enter your email address." })
    : t("landing.leadCapture.emailInvalid", { defaultValue: "Enter a correctly formatted email, such as name@example.com." });

  return (
    <section id="guide" className="scroll-mt-24 py-16 md:py-20">
      <div className="container">
        <FadeUp className="max-w-2xl mx-auto">
          <div className="relative p-8 md:p-12 rounded-3xl bg-[#0f1d32] border border-[#1e3050] hover:border-primary/20 transition-colors duration-300 text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/8 to-transparent rounded-bl-[4rem]" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary/5 to-transparent rounded-tr-[3rem]" />

            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
                <Mail size={24} className="text-primary" />
              </div>
              <h2 className="font-display font-bold text-2xl md:text-3xl text-white mb-3">
                {t("landing.leadCapture.heading", { defaultValue: "Not ready to commit?" })}
              </h2>
              <p className="text-slate-200 font-medium mb-8 max-w-md mx-auto">
                {t("landing.leadCapture.description", { defaultValue: "Get a free guide on how to 3× your Google reviews in 30 days — plus early access to new features and reputation tips." })}
              </p>

              {!submitted ? (
                <>
                  <form onSubmit={handleSubmit} noValidate className="max-w-md mx-auto">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <label htmlFor="lead-capture-email" className="sr-only">
                        {t("landing.leadCapture.emailLabel", { defaultValue: "Email address" })}
                      </label>
                      <input
                        id="lead-capture-email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (error) setError(null);
                        }}
                        onBlur={() => setEmailTouched(true)}
                        placeholder={t("landing.leadCapture.emailPlaceholder", { defaultValue: "Enter your email" })}
                        required
                        autoComplete="email"
                        inputMode="email"
                        aria-label={t("landing.leadCapture.emailLabel", { defaultValue: "Email address" })}
                        aria-invalid={showEmailError}
                        aria-describedby="lead-email-guidance"
                        disabled={submitLead.isPending}
                        className={`flex-1 px-4 py-3.5 bg-[#1a2744] border rounded-xl text-white placeholder:text-slate-400 font-medium focus:outline-none focus:ring-1 transition-all disabled:opacity-60 ${showEmailError ? "border-red-400 focus:border-red-400 focus:ring-red-400/20" : "border-[#2a3a5c] focus:border-primary/50 focus:ring-primary/20"}`}
                      />
                      <button
                        type="submit"
                        disabled={submitLead.isPending || validation.error !== null}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:brightness-110 transition-all duration-200 active:scale-[0.97] whitespace-nowrap shadow-[0_0_20px_oklch(0.78_0.15_75/0.2)] disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                      {submitLead.isPending ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          {t("landing.leadCapture.sending", { defaultValue: "Sending..." })}
                        </>
                      ) : (
                        <>
                          {t("landing.leadCapture.sendGuideButton", { defaultValue: "Send Guide" })}
                          <ArrowRight size={15} />
                        </>
                      )}
                      </button>
                    </div>
                    <p
                      id="lead-email-guidance"
                      className={`mt-2 text-left text-sm font-medium ${showEmailError ? "text-red-300" : "text-slate-300"}`}
                      aria-live="polite"
                    >
                      {showEmailError
                        ? emailErrorMessage
                        : t("landing.leadCapture.emailConfirmationHint", { defaultValue: "We’ll show the address again before you leave so you can catch a typo." })}
                    </p>
                  </form>
                  {error && (
                    <p className="text-sm text-red-400 font-medium mt-3">{error}</p>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
                  <div className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl border ${delivery?.providerAccepted ? "bg-emerald-500/10 border-emerald-500/20" : "bg-amber-400/10 border-amber-400/20"}`}>
                    <Check size={18} className="text-emerald-400" />
                    <span className={`font-medium ${delivery?.providerAccepted ? "text-emerald-300" : "text-amber-200"}`}>
                      {delivery?.providerAccepted
                        ? t("landing.leadCapture.providerAcceptedMessage", { defaultValue: "Your email provider accepted the guide for delivery." })
                        : t("landing.leadCapture.downloadReadyMessage", { defaultValue: "Your guide is ready to download." })}
                    </span>
                  </div>
                  <p className="max-w-lg text-sm font-medium leading-relaxed text-slate-200">
                    {delivery?.providerAccepted
                      ? t("landing.leadCapture.addressConfirmation", { defaultValue: "We sent it to {{email}}. Confirm the spelling and check spam if it does not arrive. Provider acceptance does not guarantee inbox placement.", email: submittedEmail })
                      : t("landing.leadCapture.deliveryFallback", { defaultValue: "Email delivery was unavailable for {{email}}. Confirm the spelling, retry, or download the guide now.", email: submittedEmail })}
                  </p>
                  {delivery?.downloadUrl && (
                    <a
                      href={delivery.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_oklch(0.78_0.15_75/0.2)] transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
                    >
                      <Download size={16} />
                      {t("landing.leadCapture.downloadGuideButton", { defaultValue: "Download the PDF guide" })}
                    </a>
                  )}
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleEditEmail}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-500/50 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-primary/60 hover:text-primary"
                    >
                      <Pencil size={15} />
                      {t("landing.leadCapture.editEmail", { defaultValue: "Edit email" })}
                    </button>
                    {!delivery?.providerAccepted && (
                      <button
                        type="button"
                        onClick={handleRetry}
                        disabled={submitLead.isPending}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-500/50 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-primary/60 hover:text-primary disabled:opacity-60"
                      >
                        <RotateCw size={15} className={submitLead.isPending ? "animate-spin" : ""} />
                        {t("landing.leadCapture.tryAgain", { defaultValue: "Try email again" })}
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-7 border-t border-[#2a3a5c] pt-6">
                <p className="mb-3 text-sm font-semibold text-white">
                  {t("landing.leadCapture.sharePrompt", { defaultValue: "Know someone who needs more reviews? Share the free playbook." })}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <a
                    href={shareUrls.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97]"
                    aria-label="Share the Get Phame PDF guide on X or Twitter"
                  >
                    <Twitter size={16} />
                    X / Twitter
                  </a>
                  <a
                    href={shareUrls.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0A66C2] px-4 py-2.5 text-sm font-semibold text-white transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97]"
                    aria-label="Share the Get Phame PDF guide on LinkedIn"
                  >
                    <Linkedin size={16} />
                    LinkedIn
                  </a>
                </div>
              </div>

              <p className="text-sm text-slate-300 font-medium mt-4">
                {t("landing.leadCapture.noSpamMessage", { defaultValue: "No spam. Unsubscribe anytime. We respect your inbox." })}
              </p>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
