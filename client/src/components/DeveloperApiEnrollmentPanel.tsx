import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, FileCheck2, Loader2, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { DEVELOPER_SEND_SCOPE_SELF_SERVICE_MAX_MONTHLY } from "@shared/developerApiEnrollment";
import { trpc } from "@/lib/trpc";

export function DeveloperApiEnrollmentPanel() {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const enrollment = trpc.apiKey.enrollment.useQuery();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [acceptableUseAccepted, setAcceptableUseAccepted] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [useCase, setUseCase] = useState("");
  const [monthlyVolume, setMonthlyVolume] = useState("500");
  const [consentProcess, setConsentProcess] = useState("");
  const [existingCustomersOnly, setExistingCustomersOnly] = useState(false);
  const [noThirdPartyLists, setNoThirdPartyLists] = useState(false);
  const [individualActionsOnly, setIndividualActionsOnly] = useState(false);

  useEffect(() => {
    const businessUse = enrollment.data?.businessUse;
    if (!businessUse) return;
    setBusinessName(businessUse.businessName);
    setWebsiteUrl(businessUse.websiteUrl);
    setUseCase(businessUse.useCase);
    setMonthlyVolume(String(businessUse.expectedMonthlySendVolume || 500));
    setConsentProcess(businessUse.consentProcess);
  }, [enrollment.data?.businessUse]);

  const acceptTerms = trpc.apiKey.acceptTerms.useMutation({
    onSuccess: async () => {
      await utils.apiKey.enrollment.invalidate();
      setTermsAccepted(false);
      setAcceptableUseAccepted(false);
      toast.success(t("developerEnrollment.terms.acceptedToast", { defaultValue: "API Terms accepted. You can now create import-only keys." }));
    },
    onError: (error) => toast.error(error.message),
  });

  const requestSendScope = trpc.apiKey.requestSendScope.useMutation({
    onSuccess: async (status) => {
      await utils.apiKey.enrollment.invalidate();
      setExistingCustomersOnly(false);
      setNoThirdPartyLists(false);
      setIndividualActionsOnly(false);
      toast.success(status.sendScopeApproved
        ? t("developerEnrollment.send.approvedToast", { defaultValue: "Sending access approved. You can now add review_requests:send to a key." })
        : t("developerEnrollment.send.pendingToast", { defaultValue: "Request submitted for review. Import-only access remains available." }));
    },
    onError: (error) => toast.error(error.message),
  });

  if (enrollment.isLoading) {
    return <div className="flex min-h-32 items-center justify-center rounded-3xl bg-white shadow-sm"><Loader2 className="animate-spin rr-text-navy" aria-label={t("developerEnrollment.loading", { defaultValue: "Loading developer enrollment" })} /></div>;
  }

  if (enrollment.error) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800" role="alert">{enrollment.error.message}</div>;
  }

  const status = enrollment.data;
  const canSubmitSendRequest = businessName.trim().length >= 2
    && useCase.trim().length >= 20
    && consentProcess.trim().length >= 20
    && Number(monthlyVolume) >= 1
    && existingCustomersOnly
    && noThirdPartyLists
    && individualActionsOnly;

  return (
    <section id="developer-enrollment" aria-labelledby="developer-enrollment-title" className="scroll-mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl rr-bg-navy rr-text-gold"><FileCheck2 size={20} aria-hidden="true" /></span>
        <div>
          <h2 id="developer-enrollment-title" className="text-xl font-semibold rr-text-navy">{t("developerEnrollment.title", { defaultValue: "Developer enrollment" })}</h2>
          <p className="mt-1 text-sm leading-6 rr-text-navy-muted">{t("developerEnrollment.description", { defaultValue: "Accept the API rules once, start with safe contact imports, and provide business details only if your integration needs to send individual review requests." })}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className={`rounded-2xl border p-4 ${status?.termsAccepted ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className={status?.termsAccepted ? "mt-0.5 shrink-0 text-emerald-700" : "mt-0.5 shrink-0 rr-text-navy"} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h3 className="font-bold rr-text-navy">{t("developerEnrollment.terms.title", { defaultValue: "1. Accept API Terms" })}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">{t("developerEnrollment.terms.description", { defaultValue: "Keys may be used only from secure server-side integrations for customers with a genuine business relationship and appropriate consent." })}</p>
              {status?.termsAccepted ? (
                <div className="mt-3 flex items-center gap-2 text-sm font-bold text-emerald-800" role="status"><Check size={16} aria-hidden="true" />{t("developerEnrollment.terms.current", { defaultValue: "Current API Terms and Acceptable Use Policy accepted" })}</div>
              ) : (
                <div className="mt-4 space-y-3">
                  <label className="flex cursor-pointer items-start gap-3 text-sm leading-5 text-slate-700"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1 size-4 accent-[oklch(0.66_0.16_80)]" /><span>{t("developerEnrollment.terms.termsLabel", { defaultValue: "I accept the API Terms in the Get Phame Terms of Service." })} <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="font-bold underline rr-text-navy">{t("developerEnrollment.terms.readTerms", { defaultValue: "Read Terms" })}</a></span></label>
                  <label className="flex cursor-pointer items-start gap-3 text-sm leading-5 text-slate-700"><input type="checkbox" checked={acceptableUseAccepted} onChange={(event) => setAcceptableUseAccepted(event.target.checked)} className="mt-1 size-4 accent-[oklch(0.66_0.16_80)]" /><span>{t("developerEnrollment.terms.aupLabel", { defaultValue: "I accept the Acceptable Use Policy: no spam, purchased or scraped lists, browser-exposed keys, rate-limit bypassing, or deceptive automation." })} <a href="/compliance" target="_blank" rel="noopener noreferrer" className="font-bold underline rr-text-navy">{t("developerEnrollment.terms.readGuide", { defaultValue: "Read Compliance Guide" })}</a></span></label>
                  <button type="button" onClick={() => acceptTerms.mutate({ termsAccepted: true, acceptableUseAccepted: true })} disabled={!termsAccepted || !acceptableUseAccepted || acceptTerms.isPending} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-black rr-bg-gold rr-text-navy transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{acceptTerms.isPending && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}{t("developerEnrollment.terms.accept", { defaultValue: "Accept and enable import keys" })}</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div id="developer-send-enrollment" className={`scroll-mt-6 rounded-2xl border p-4 ${status?.sendScopeApproved ? "border-emerald-200 bg-emerald-50" : status?.sendScopeStatus === "pending_review" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
          <div className="flex items-start gap-3">
            <Send size={20} className="mt-0.5 shrink-0 rr-text-navy" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h3 className="font-bold rr-text-navy">{t("developerEnrollment.send.title", { defaultValue: "2. Optional sending access" })}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">{t("developerEnrollment.send.description", { defaultValue: "Importing contacts never sends automatically. Complete this short business-use check only if your integration must send one review request after an approved customer action." })}</p>

              {!status?.termsAccepted ? (
                <p className="mt-3 text-sm font-bold text-slate-600">{t("developerEnrollment.send.acceptFirst", { defaultValue: "Accept the API Terms first. Import-only access will be enabled immediately." })}</p>
              ) : status.sendScopeApproved ? (
                <div className="mt-3 flex items-center gap-2 text-sm font-bold text-emerald-800" role="status"><Check size={16} aria-hidden="true" />{t("developerEnrollment.send.approved", { defaultValue: "Approved for individual review-request sending" })}</div>
              ) : status.sendScopeStatus === "pending_review" ? (
                <div className="mt-3 text-sm leading-6 text-amber-950" role="status"><p className="font-bold">{t("developerEnrollment.send.pending", { defaultValue: "High-volume request pending review" })}</p><p>{t("developerEnrollment.send.pendingDetail", { defaultValue: "Your import-only keys continue to work. Get Phame will not add sending permission until this review is approved." })}</p></div>
              ) : (
                <form className="mt-4 grid gap-3" onSubmit={(event) => {
                  event.preventDefault();
                  if (!canSubmitSendRequest) return toast.error(t("developerEnrollment.send.completeRequired", { defaultValue: "Complete every business-use field and confirmation." }));
                  requestSendScope.mutate({
                    businessName: businessName.trim(),
                    websiteUrl: websiteUrl.trim(),
                    useCase: useCase.trim(),
                    expectedMonthlySendVolume: Number(monthlyVolume),
                    consentProcess: consentProcess.trim(),
                    confirmsExistingCustomersOnly: true,
                    confirmsNoPurchasedOrScrapedLists: true,
                    confirmsIndividualCustomerActions: true,
                  });
                }}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label><span className="mb-1 block text-xs font-bold rr-text-navy">{t("developerEnrollment.send.businessName", { defaultValue: "Business name" })}</span><input value={businessName} onChange={(event) => setBusinessName(event.target.value)} required minLength={2} maxLength={160} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm rr-text-navy outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.66_0.16_80)]" /></label>
                    <label><span className="mb-1 block text-xs font-bold rr-text-navy">{t("developerEnrollment.send.website", { defaultValue: "Website (optional)" })}</span><input type="url" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} maxLength={512} placeholder="https://" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm rr-text-navy outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.66_0.16_80)]" /></label>
                  </div>
                  <label><span className="mb-1 block text-xs font-bold rr-text-navy">{t("developerEnrollment.send.useCase", { defaultValue: "How will the integration use sending access?" })}</span><textarea value={useCase} onChange={(event) => setUseCase(event.target.value)} required minLength={20} maxLength={1500} rows={3} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm rr-text-navy outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.66_0.16_80)]" placeholder={t("developerEnrollment.send.useCasePlaceholder", { defaultValue: "Example: After a completed appointment, our server imports the customer and sends one review request." })} /></label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label><span className="mb-1 block text-xs font-bold rr-text-navy">{t("developerEnrollment.send.monthlyVolume", { defaultValue: "Expected sends per month" })}</span><input type="number" min={1} max={1_000_000} value={monthlyVolume} onChange={(event) => setMonthlyVolume(event.target.value)} required className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm rr-text-navy outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.66_0.16_80)]" /></label>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">{t("developerEnrollment.send.reviewThreshold", { defaultValue: "Up to {{count}} expected sends per month can be enabled immediately. Higher-volume requests require manual review and never bypass adaptive safety limits.", count: DEVELOPER_SEND_SCOPE_SELF_SERVICE_MAX_MONTHLY.toLocaleString() })}</div>
                  </div>
                  <label><span className="mb-1 block text-xs font-bold rr-text-navy">{t("developerEnrollment.send.consentProcess", { defaultValue: "How do you confirm the customer relationship and consent?" })}</span><textarea value={consentProcess} onChange={(event) => setConsentProcess(event.target.value)} required minLength={20} maxLength={1500} rows={3} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm rr-text-navy outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.66_0.16_80)]" placeholder={t("developerEnrollment.send.consentPlaceholder", { defaultValue: "Describe the purchase, appointment, or service event and how opt-outs are respected." })} /></label>
                  <div className="space-y-2">
                    <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-slate-700"><input type="checkbox" checked={existingCustomersOnly} onChange={(event) => setExistingCustomersOnly(event.target.checked)} className="mt-1 size-4 accent-[oklch(0.66_0.16_80)]" />{t("developerEnrollment.send.confirmCustomers", { defaultValue: "I will send only to customers with a genuine business relationship." })}</label>
                    <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-slate-700"><input type="checkbox" checked={noThirdPartyLists} onChange={(event) => setNoThirdPartyLists(event.target.checked)} className="mt-1 size-4 accent-[oklch(0.66_0.16_80)]" />{t("developerEnrollment.send.confirmLists", { defaultValue: "I will not use purchased, rented, scraped, or third-party lists." })}</label>
                    <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-slate-700"><input type="checkbox" checked={individualActionsOnly} onChange={(event) => setIndividualActionsOnly(event.target.checked)} className="mt-1 size-4 accent-[oklch(0.66_0.16_80)]" />{t("developerEnrollment.send.confirmActions", { defaultValue: "Each API send will follow an approved individual customer action; I will respect opt-outs and adaptive limits." })}</label>
                  </div>
                  <button type="submit" disabled={!canSubmitSendRequest || requestSendScope.isPending} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-black rr-bg-navy rr-text-gold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{requestSendScope.isPending && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}{status.sendScopeStatus === "denied" ? t("developerEnrollment.send.resubmit", { defaultValue: "Resubmit business-use details" }) : t("developerEnrollment.send.request", { defaultValue: "Enable sending access" })}</button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
