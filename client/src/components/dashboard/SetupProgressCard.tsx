import { useCallback, useEffect, useMemo, useRef } from "react";
import { CheckCircle2, ChevronRight, Mail, Send, Upload, Globe2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { claimOnboardingChecklistTelemetryEvent, type OnboardingChecklistTelemetryEvent } from "@/lib/onboardingChecklistTelemetry";

interface SetupStatus {
  smtpConnected: boolean;
  hasPlatform: boolean;
  hasContacts: boolean;
  hasSentRequest: boolean;
}

interface SetupProgressCardProps {
  status?: Partial<SetupStatus>;
  userId?: number | null;
  onNavigate: (path: string) => void;
}

export default function SetupProgressCard({ status, userId, onNavigate }: SetupProgressCardProps) {
  const { t } = useTranslation("translation");
  const { mutate: submitChecklistEvent } = trpc.analytics.trackOnboardingChecklistEvent.useMutation();
  const trackedEvents = useRef(new Set<string>());
  const steps = useMemo(() => [
    {
      id: "email",
      complete: Boolean(status?.smtpConnected),
      icon: Mail,
      title: t("homePage.setupStepEmail"),
      description: t("homePage.setupStepEmailDescription"),
      action: t("homePage.setupActionEmail"),
      path: "/settings",
    },
    {
      id: "platform",
      complete: Boolean(status?.hasPlatform),
      icon: Globe2,
      title: t("homePage.setupStepPlatform"),
      description: t("homePage.setupStepPlatformDescription"),
      action: t("homePage.setupActionPlatform"),
      path: "/settings",
    },
    {
      id: "contacts",
      complete: Boolean(status?.hasContacts),
      icon: Upload,
      title: t("homePage.setupStepContacts"),
      description: t("homePage.setupStepContactsDescription"),
      action: t("homePage.setupActionContacts"),
      path: "/import",
    },
    {
      id: "send",
      complete: Boolean(status?.hasSentRequest),
      icon: Send,
      title: t("homePage.setupStepSend"),
      description: t("homePage.setupStepSendDescription"),
      action: t("homePage.setupActionSend"),
      path: "/send",
    },
  ], [status?.smtpConnected, status?.hasPlatform, status?.hasContacts, status?.hasSentRequest, t]);
  const completedCount = steps.filter((step) => step.complete).length;
  const progress = (completedCount / steps.length) * 100;
  const incompleteStepIds = steps.filter((step) => !step.complete).map((step) => step.id).join(",");

  const trackChecklistEvent = useCallback((event: OnboardingChecklistTelemetryEvent) => {
    if (!claimOnboardingChecklistTelemetryEvent(userId, event, trackedEvents.current)) return;
    submitChecklistEvent({ event });
  }, [submitChecklistEvent, userId]);

  useEffect(() => {
    trackChecklistEvent("checklist_viewed");
    if (completedCount === steps.length) {
      trackChecklistEvent("checklist_completed");
      return;
    }
    for (const stepId of incompleteStepIds.split(",").filter(Boolean)) {
      trackChecklistEvent(`${stepId}_step_viewed` as OnboardingChecklistTelemetryEvent);
    }
  }, [completedCount, incompleteStepIds, trackChecklistEvent]);

  return (
    <section className="rr-card p-4" aria-labelledby="setup-progress-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="rr-h6 rr-text-gold">{t("homePage.setupProgressEyebrow")}</p>
          <h2 id="setup-progress-title" className="rr-h4 mt-1 rr-text-navy">{t("homePage.completeSetup")}</h2>
          <p className="rr-b2 mt-1 rr-text-navy-mid">{t("homePage.setupProgressDescription")}</p>
        </div>
        <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-black rr-bg-gold rr-text-navy">
          {t("homePage.setupProgressCount", { completed: completedCount, total: steps.length })}
        </span>
      </div>

      <div className="mt-4" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={completedCount} aria-valuetext={t("homePage.setupProgressCount", { completed: completedCount, total: steps.length })}>
        <div className="h-2 overflow-hidden rounded-full rr-bg-surface">
          <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${progress}%`, background: "var(--gold)" }} />
        </div>
      </div>

      <ol className="mt-4 divide-y" style={{ borderColor: "oklch(0.92 0.005 100)" }}>
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${step.complete ? "rr-bg-green-pale" : "rr-bg-surface"}`}>
                {step.complete ? (
                  <CheckCircle2 size={19} className="rr-text-green" aria-label={t("homePage.setupStepComplete")} />
                ) : (
                  <Icon size={17} className="rr-text-navy" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`rr-h5 ${step.complete ? "rr-text-green" : "rr-text-navy"}`}>{step.title}</p>
                <p className="rr-l2 mt-0.5 rr-text-navy-mid">{step.complete ? t("homePage.setupStepComplete") : step.description}</p>
              </div>
              {!step.complete && (
                <button
                  type="button"
                  onClick={() => {
                    trackChecklistEvent(`${step.id}_step_actioned` as OnboardingChecklistTelemetryEvent);
                    onNavigate(step.path);
                  }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold rr-text-navy transition-colors hover:rr-bg-gold-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="hidden sm:inline">{step.action}</span>
                  <ChevronRight size={16} aria-hidden="true" />
                  <span className="sr-only">{step.action}</span>
                </button>
              )}
              {!step.complete && <span className="sr-only">{t("homePage.setupStepNumber", { step: index + 1 })}</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
