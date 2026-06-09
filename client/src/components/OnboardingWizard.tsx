/**
 * OnboardingWizard — Three-step first-login setup flow.
 *
 * Step 1: Connect Email (SMTP)
 * Step 2: Add Review Platform URL
 * Step 3: Send First Request
 *
 * Shown as a full-screen overlay when the user is authenticated and has not
 * completed or dismissed onboarding. Dismissible at any time via the Skip button.
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Mail,
  Globe,
  Star,
  CheckCircle2,
  X,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OnboardingWizardProps {
  onDismiss: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORM_OPTIONS = [
  { value: "google", label: "Google" },
  { value: "yelp", label: "Yelp" },
  { value: "tripadvisor", label: "TripAdvisor" },
  { value: "facebook", label: "Facebook" },
  { value: "bing", label: "Bing" },
  { value: "apple", label: "Apple Maps" },
  { value: "other", label: "Other" },
] as const;

const PLATFORM_PLACEHOLDERS: Record<string, string> = {
  google: "https://g.page/r/your-business/review",
  yelp: "https://www.yelp.com/writeareview/biz/your-business",
  tripadvisor: "https://www.tripadvisor.com/UserReviewEdit-...",
  facebook: "https://www.facebook.com/your-page/reviews",
  bing: "https://www.bingplaces.com/...",
  apple: "https://maps.apple.com/?cid=your-business-id",
  other: "https://your-review-page.com",
};

const KNOWN_HOSTS: Record<string, { host: string; port: number; secure: number }> = {
  "gmail.com": { host: "smtp.gmail.com", port: 587, secure: 0 },
  "googlemail.com": { host: "smtp.gmail.com", port: 587, secure: 0 },
  "outlook.com": { host: "smtp-mail.outlook.com", port: 587, secure: 0 },
  "hotmail.com": { host: "smtp-mail.outlook.com", port: 587, secure: 0 },
  "live.com": { host: "smtp-mail.outlook.com", port: 587, secure: 0 },
  "yahoo.com": { host: "smtp.mail.yahoo.com", port: 587, secure: 0 },
  "icloud.com": { host: "smtp.mail.me.com", port: 587, secure: 0 },
  "zoho.com": { host: "smtp.zoho.com", port: 587, secure: 0 },
  "zohomail.com": { host: "smtp.zoho.com", port: 587, secure: 0 },
  "aol.com": { host: "smtp.aol.com", port: 587, secure: 0 },
  "fastmail.com": { host: "smtp.fastmail.com", port: 587, secure: 0 },
};

// APP_PASSWORD_HINTS are now resolved via t() using step1Email.hints keys

// Preset SMTP configurations for one-tap selection in the advanced panel
const SMTP_PRESETS = [
  { label: "Google Workspace", host: "smtp.gmail.com", port: 587 },
  { label: "Outlook / Microsoft 365", host: "smtp-mail.outlook.com", port: 587 },
  { label: "Zoho Mail", host: "smtp.zoho.com", port: 587 },
  { label: "Yahoo Mail", host: "smtp.mail.yahoo.com", port: 587 },
] as const;

// GOOGLE_WORKSPACE_HINT and ZOHO_HOST_HINT are now resolved via t() using step1Email.hints keys

function detectHost(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? KNOWN_HOSTS[domain] ?? null : null;
}

/** Returns the app-password hint key based on email domain OR manually-entered host */
function getHintKey(email: string, host?: string): string | null {
  const domain = email.split("@")[1]?.toLowerCase();
  if (host === "smtp.gmail.com" && domain && !KNOWN_HOSTS[domain]) {
    return "step1Email.hints.googleWorkspaceHint";
  }
  if (host === "smtp.zoho.com" && domain && domain !== "zoho.com" && domain !== "zohomail.com") {
    return "step1Email.hints.zohoHostHint";
  }
  if (!domain) return null;
  if (domain === "gmail.com" || domain === "googlemail.com") return "step1Email.hints.gmailAppPassword";
  if (domain === "outlook.com" || domain === "hotmail.com" || domain === "live.com") return "step1Email.hints.outlookAppPassword";
  if (domain === "yahoo.com") return "step1Email.hints.yahooAppPassword";
  if (domain === "zoho.com" || domain === "zohomail.com") return "step1Email.hints.zohoSmtpAccess";
  return null;
}

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepDot({ step, current, done }: { step: number; current: number; done: boolean }) {
  const isActive = step === current;
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
        style={{
          background: done
            ? "oklch(0.55 0.18 145)"
            : isActive
            ? "oklch(0.80 0.18 80)"
            : "oklch(0.30 0.05 260)",
          color: done || isActive ? "oklch(0.15 0.05 260)" : "oklch(0.60 0.03 260)",
        }}
      >
        {done ? <CheckCircle2 size={16} /> : step}
      </div>
    </div>
  );
}

// ── Step 1: Connect Email ──────────────────────────────────────────────────────

function Step1Email({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [host, setHost] = useState("");
  const [port, setPort] = useState(587);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingCredentials, setTestingCredentials] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");

  const testCredentials = trpc.smtp.testCredentials.useMutation();

  const connectSmtp = trpc.smtp.connect.useMutation({
    onSuccess: (_, variables) => {
      utils.smtp.status.invalidate();
      utils.onboarding.status.invalidate();
      toast.success(
        t("step1Email.toast.emailConnectedSuccess", { email: variables.email }),
        { duration: 6000 }
      );
      setTimeout(onDone, 1000);
    },
    onError: (err) => toast.error(err.message),
  });

  // Auto-detect host when email changes
  useEffect(() => {
    const detected = detectHost(email);
    if (detected) {
      setHost(detected.host);
      setPort(detected.port);
    }
  }, [email]);

  const hintKey = getHintKey(email, host);
  const hint = hintKey ? t(hintKey) : null;
  const detectedAuto = !!detectHost(email);
  // Show Google Workspace disclosure when auto-detect fails and user has a custom domain
  const showWorkspaceDisclosure =
    !detectedAuto &&
    email.includes("@") &&
    !host && // hasn't manually set a host yet
    !!email.split("@")[1]; // has a domain

  async function handleTestCredentials() {
    if (!email || !password) {
      toast.error(t("step1Email.toast.enterEmailPassword"));
      return;
    }
    const resolvedHost = host || `smtp.${email.split("@")[1]}`;
    setTestingCredentials(true);
    setTestResult(null);
    try {
      const result = await testCredentials.mutateAsync({
        email,
        password,
        host: resolvedHost,
        port,
        secure: port === 465 ? 1 : 0,
      });
      setTestResult(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("step1Email.toast.connectionTestFailed");
      setTestResult({ ok: false, error: message });
    } finally {
      setTestingCredentials(false);
    }
  }

  async function handleConnect() {
    if (!email || !password) {
      toast.error(t("step1Email.toast.enterEmailPassword"));
      return;
    }
    setTesting(true);
    try {
      await connectSmtp.mutateAsync({
        email,
        password,
        host: host || `smtp.${email.split("@")[1]}`,
        port,
        secure: port === 465 ? 1 : 0,
        fromName: fromName.trim() || undefined,
        replyTo: replyTo.trim() || undefined,
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.70 0.04 260)" }}>
          {t("step1Email.emailAddressLabel")}
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("step1Email.emailAddressPlaceholder")}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none text-white" style={{ background: "oklch(0.18 0.06 260)", border: "1px solid oklch(0.32 0.06 260)" }}
        />
      </div>

      <div>
        <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.70 0.04 260)" }}>
          {t("step1Email.passwordLabel")} {hint ? t("step1Email.appPasswordRequiredSuffix") : ""}
        </label>
        <div className="relative">
          <input
            type={showPass ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={hint ? t("step1Email.appPasswordPlaceholder") : t("step1Email.emailPasswordPlaceholder")}
            className="w-full px-4 py-3 pr-10 rounded-xl text-sm outline-none text-white" style={{ background: "oklch(0.18 0.06 260)", border: "1px solid oklch(0.32 0.06 260)" }}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rr-text-navy-muted"
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {hint && (
          <div
            className="flex items-start gap-2 mt-2 px-3 py-2 rounded-lg rr-text-gold" style={{ background: "oklch(0.22 0.08 80)" }}
          >
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <p className="text-xs">{hint}</p>
          </div>
        )}
      </div>

      {/* From Name — promoted to main form */}
      <div>
        <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.70 0.04 260)" }}>
          {t("step1Email.fromNameLabel")} <span className="rr-text-navy-muted rr-fw-normal">({t("settings.fromNameHint", "shown as sender")})</span>
        </label>
        <input
          type="text"
          value={fromName}
          onChange={(e) => setFromName(e.target.value)}
          placeholder={t("step1Email.fromNamePlaceholder")}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none text-white" style={{ background: "oklch(0.18 0.06 260)", border: "1px solid oklch(0.32 0.06 260)" }}
        />
        <p className="text-xs mt-1 rr-text-navy-muted">
          {t("settings.fromNameDescription", "Customers will see this as the sender name in their inbox.")}
        </p>
      </div>
      {/* Reply-To — optional */}
      <div>
        <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.70 0.04 260)" }}>
          {t("step1Email.replyToEmailLabel")} <span className="rr-text-navy-muted rr-fw-normal">({t("settings.optional", "optional")})</span>
        </label>
        <input
          type="email"
          value={replyTo}
          onChange={(e) => setReplyTo(e.target.value)}
          placeholder={t("step1Email.replyToEmailPlaceholder")}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none text-white" style={{ background: "oklch(0.18 0.06 260)", border: "1px solid oklch(0.32 0.06 260)" }}
        />
        <p className="text-xs mt-1 rr-text-navy-muted">
          {t("settings.replyToDescription", "Where customer replies will go. Leave blank to use your sending address.")}
        </p>
      </div>
      {detectedAuto && (
        <p className="text-xs rr-text-green">
          ✓ {t("settings.smtpAutoDetected", { domain: email.split("@")[1], defaultValue: `SMTP settings auto-detected for ${email.split("@")[1]}` })}
        </p>
      )}

      {/* Google Workspace disclosure — shown when domain is unknown and no host set yet */}
      {showWorkspaceDisclosure && (
        <div
          className="flex items-start gap-2 px-3 py-3 rounded-xl"
          style={{ background: "oklch(0.18 0.08 250)", border: "1px solid oklch(0.35 0.10 250)" }}
        >
          <AlertCircle size={14} className="shrink-0 mt-0.5" style={{ color: "oklch(0.70 0.15 250)" }} />
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-bold" style={{ color: "oklch(0.85 0.08 250)" }}>
              {t("settings.googleWorkspaceTitle", "Using Google Workspace or a custom domain?")}
            </p>
            <p className="text-xs" style={{ color: "oklch(0.70 0.05 250)" }}>
              {t("settings.googleWorkspaceDescription", "We couldn't auto-detect your SMTP settings. Select your email provider below or enter settings manually.")}
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              {SMTP_PRESETS.map((preset) => (
                <button
                  key={preset.host}
                  type="button"
                  onClick={() => { setHost(preset.host); setPort(preset.port); setShowAdvanced(true); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                  style={{ background: "oklch(0.28 0.10 250)", color: "oklch(0.85 0.08 250)" }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!detectedAuto && email.includes("@") && (
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-left"
          style={{ color: "oklch(0.60 0.04 260)" }}
        >
          {showAdvanced ? t("step1Email.hideAdvancedSettings") : t("step1Email.showAdvancedSettings")}
        </button>
      )}

      {(showAdvanced || (!detectedAuto && email.includes("@"))) && (
        <div className="flex flex-col gap-3">
          {/* Preset quick-fill buttons in advanced panel */}
          {!detectedAuto && (
            <div className="flex flex-wrap gap-2">
              {SMTP_PRESETS.map((preset) => (
                <button
                  key={preset.host}
                  type="button"
                  onClick={() => { setHost(preset.host); setPort(preset.port); }}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors"
                  style={{
                    background: host === preset.host ? "oklch(0.80 0.18 80)" : "oklch(0.22 0.06 260)",
                    color: host === preset.host ? "oklch(0.15 0.05 260)" : "oklch(0.70 0.04 260)",
                    borderColor: host === preset.host ? "oklch(0.80 0.18 80)" : "oklch(0.35 0.06 260)",
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.70 0.04 260)" }}>
                {t("step1Email.smtpHostLabel")}
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder={`smtp.${email.split("@")[1] ?? "yourdomain.com"}`}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none text-white" style={{ background: "oklch(0.18 0.06 260)", border: "1px solid oklch(0.32 0.06 260)" }}
              />
            </div>
            <div className="w-24">
              <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.70 0.04 260)" }}>
                {t("step1Email.smtpPortLabel")}
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none text-white" style={{ background: "oklch(0.18 0.06 260)", border: "1px solid oklch(0.32 0.06 260)" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Test result feedback */}
      {testResult && (
        <div
          className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
          style={{
            background: testResult.ok ? "oklch(0.18 0.06 145)" : "oklch(0.18 0.06 30)",
            border: `1px solid ${testResult.ok ? "oklch(0.40 0.12 145)" : "oklch(0.40 0.12 30)"}`,
            color: testResult.ok ? "oklch(0.75 0.15 145)" : "oklch(0.75 0.15 30)",
          }}
        >
          <span className="shrink-0 mt-0.5">{testResult.ok ? "✓" : "✗"}</span>
            <span>{testResult.ok ? t("step1Email.testSuccessful") : (testResult.error ?? t("step1Email.testFailed", { error: "" }))}</span>
        </div>
      )}

      <div className="flex gap-2">
        {/* Test Connection — verify before committing */}
        <button
          type="button"
          onClick={handleTestCredentials}
          disabled={testingCredentials || !email || !password}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm transition-transform active:scale-95"
          style={{
            background: "oklch(0.22 0.09 260)",
            color: testingCredentials || !email || !password ? "oklch(0.45 0.05 260)" : "oklch(0.70 0.04 260)",
            border: "1px solid oklch(0.35 0.06 260)",
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          {testingCredentials ? (
            <><Loader2 size={14} className="animate-spin" />{t("step1Email.testingButton")}</>
          ) : (
            <>{t("step1Email.testCredentialsButton")}</>
          )}
        </button>

        {/* Connect Email — saves and sends welcome email */}
        <button
          onClick={handleConnect}
          disabled={testing || connectSmtp.isPending || !email || !password}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm transition-transform active:scale-95"
          style={{
            background:
              testing || connectSmtp.isPending || !email || !password
                ? "oklch(0.35 0.05 260)"
                : "oklch(0.80 0.18 80)",
            color:
              testing || connectSmtp.isPending || !email || !password
                ? "oklch(0.55 0.03 260)"
                : "oklch(0.15 0.05 260)",
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          {testing || connectSmtp.isPending ? (
            <><Loader2 size={16} className="animate-spin" />{t("step1Email.connectingButton")}</>
          ) : (
            <><Mail size={16} />{t("step1Email.connectEmailButton")}</>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Add Review Platform ────────────────────────────────────────────────

function Step2Platform({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const [platform, setPlatform] = useState<string>("google");
  const [url, setUrl] = useState("");

  const addPlatform = trpc.reviewPlatforms.add.useMutation({
    onSuccess: () => {
      utils.reviewPlatforms.list.invalidate();
      utils.onboarding.status.invalidate();
      toast.success(t("step2Platform.toast.platformAdded"));
      setTimeout(onDone, 800);
    },
    onError: (err) => toast.error(err.message),
  });

  function handleAdd() {
    if (!url.trim()) {
      toast.error(t("step2Platform.toast.enterUrl"));
      return;
    }
    addPlatform.mutate({
      platform: platform as "google" | "yelp" | "tripadvisor" | "bing" | "facebook" | "apple" | "other",
      url: url.trim(),
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.70 0.04 260)" }}>
          {t("step2Platform.reviewPlatformLabel")}
        </label>
        <select
          value={platform}
          onChange={(e) => { setPlatform(e.target.value); setUrl(""); }}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none text-white" style={{ background: "oklch(0.18 0.06 260)", border: "1px solid oklch(0.32 0.06 260)" }}
        >
          {PLATFORM_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.70 0.04 260)" }}>
          {t("step2Platform.reviewPageUrlLabel")}
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={PLATFORM_PLACEHOLDERS[platform]}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none text-white" style={{ background: "oklch(0.18 0.06 260)", border: "1px solid oklch(0.32 0.06 260)" }}
        />
        <p className="text-xs mt-1" style={{ color: "oklch(0.50 0.03 260)" }}>
          {t("step2Platform.reviewPageUrlHint")}
        </p>
      </div>

      <button
        onClick={handleAdd}
        disabled={addPlatform.isPending || !url.trim()}
        className="flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm transition-transform active:scale-95"
        style={{
          background:
            addPlatform.isPending || !url.trim()
              ? "oklch(0.35 0.05 260)"
              : "oklch(0.80 0.18 80)",
          color:
            addPlatform.isPending || !url.trim()
              ? "oklch(0.55 0.03 260)"
              : "oklch(0.15 0.05 260)",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        {addPlatform.isPending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {t("step2Platform.savingButton")}
          </>
        ) : (
          <>
            <Globe size={16} />
            {t("step2Platform.savePlatformButton")}
          </>
        )}
      </button>
    </div>
  );
}

// ── Step 3: Send First Request ─────────────────────────────────────────────────

function Step3Send({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const dismissMutation = trpc.onboarding.dismiss.useMutation();

  function handleGoSend() {
    // Dismiss the wizard first, then navigate to /send.
    // The wizard will also auto-hide once hasSentRequest becomes true
    // (the onboarding.status query polls every 5s and checks customer_requests count).
    dismissMutation.mutate(undefined, {
      onSettled: () => {
        onDismiss();
        navigate("/send");
      },
    });
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center py-4">
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center rr-bg-navy overflow-hidden"
      >
        <img src="https://assets.getphame.app/phame-app-icon-new.png" alt="Phame" className="w-20 h-20 object-contain" />
      </div>
      <div>
        <h3
          className="text-xl font-black mb-2 text-white"
        >
          {t("step3Send.allSetTitle")}
        </h3>
        <p className="text-sm" style={{ color: "oklch(0.65 0.04 260)" }}>
          {t("step3Send.allSetDescription")}
        </p>
      </div>
      <button
        onClick={handleGoSend}
        className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-base transition-transform active:scale-95 w-full rr-bg-gold" style={{ color: "oklch(0.15 0.05 260)" }}
      >
        <Star size={18} />
        {t("step3Send.sendFirstRequestButton")}
      </button>
    </div>
  );
}

// ── Main Wizard ────────────────────────────────────────────────────────────────

export default function OnboardingWizard({ onDismiss }: OnboardingWizardProps) {
  const { t } = useTranslation();
  const { data: status, isLoading } = trpc.onboarding.status.useQuery(undefined, {
    refetchInterval: 3000, // poll so steps auto-advance when completed elsewhere
  });

  const dismissMutation = trpc.onboarding.dismiss.useMutation({
    onSuccess: onDismiss,
  });

  // Derive minimum step from server state (can't go back below what's done)
  const minStep = !status?.smtpConnected ? 1 : !status?.hasPlatform ? 2 : 3;
  const [viewStep, setViewStep] = useState<number | null>(null);
  // Auto-advance viewStep when server confirms a step is done
  const currentStep = viewStep ?? minStep;
  const steps = [
    { id: 1, label: t("onboardingWizard.steps.connectEmail"), icon: Mail, done: !!status?.smtpConnected },
    { id: 2, label: t("onboardingWizard.steps.reviewPlatform"), icon: Globe, done: !!status?.hasPlatform },
    { id: 3, label: t("onboardingWizard.steps.sendRequest"), icon: Star, done: !!status?.hasSentRequest },
  ];
  function handleStepDone() {
    // Auto-advance to next step when server confirms completion
    setViewStep((prev) => Math.min((prev ?? minStep) + 1, 3));
  }
  function handleNext() {
    setViewStep((prev) => Math.min((prev ?? currentStep) + 1, 3));
  }
  function handlePrev() {
    setViewStep((prev) => Math.max((prev ?? currentStep) - 1, 1));
  }

  if (isLoading) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", paddingBottom: "calc(5rem + env(safe-area-inset-bottom))", paddingTop: "1rem" }}
    >
      <div
        className="w-full max-w-md rounded-3xl flex flex-col"
        style={{ background: "oklch(0.14 0.05 260)", maxHeight: "calc(100dvh - 7rem)", overflow: "hidden" }}
      >
        {/* Header */}
        <div
          className="px-6 pt-6 pb-4 rr-bg-navy"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star size={18} className="rr-text-gold" />
              <span
                className="text-xs font-bold tracking-widest uppercase rr-text-gold"
              >
                {t("onboardingWizard.header.title")}
              </span>
            </div>
            <button
              onClick={() => dismissMutation.mutate()}
              className="p-1 rounded-lg transition-colors"
              style={{ color: "var(--text-on-dark-primary)" }}
              title={t("onboardingWizard.header.skipSetupTooltip")}
            >
              <X size={18} />
            </button>
          </div>

          {/* Tappable step bar */}
          <div className="flex gap-2 mt-1">
            {steps.map((step) => {
              const isActive = step.id === currentStep;
              const isDone = step.done;
              return (
                <button
                  key={step.id}
                  onClick={() => setViewStep(step.id)}
                  className="flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all active:scale-95"
                  style={{
                    background: isActive
                      ? "oklch(0.80 0.18 80 / 0.15)"
                      : "transparent",
                    border: isActive
                      ? "1px solid oklch(0.80 0.18 80 / 0.4)"
                      : "1px solid transparent",
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                    style={{
                      background: isDone
                        ? "oklch(0.55 0.18 145)"
                        : isActive
                        ? "oklch(0.80 0.18 80)"
                        : "oklch(0.30 0.05 260)",
                      color: isDone || isActive ? "oklch(0.15 0.05 260)" : "oklch(0.55 0.03 260)",
                    }}
                  >
                    {isDone ? <CheckCircle2 size={14} /> : step.id}
                  </div>
                  <span
                    className="text-xs font-bold leading-tight text-center"
                    style={{
                      color: isDone
                        ? "oklch(0.55 0.18 145)"
                        : isActive
                        ? "white"
                        : "oklch(0.45 0.03 260)",
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="px-6 py-6 overflow-y-auto flex-1">
          {/* Step title */}
          <div className="mb-5">
            <h2
              className="text-lg font-black mb-1 text-white"
            >
              {currentStep === 1 && t("onboardingWizard.stepContent.step1.title")}
              {currentStep === 2 && t("onboardingWizard.stepContent.step2.title")}
              {currentStep === 3 && t("onboardingWizard.stepContent.step3.title")}
            </h2>
            <p className="text-sm" style={{ color: "oklch(0.60 0.04 260)" }}>
              {currentStep === 1 && t("onboardingWizard.stepContent.step1.description")}
              {currentStep === 2 && t("onboardingWizard.stepContent.step2.description")}
              {currentStep === 3 && t("onboardingWizard.stepContent.step3.description")}
            </p>
          </div>

          {currentStep === 1 && <Step1Email onDone={handleStepDone} />}
          {currentStep === 2 && <Step2Platform onDone={handleStepDone} />}
          {currentStep === 3 && <Step3Send onDismiss={onDismiss} />}

          {/* Prev / Next navigation */}
          <div className="flex items-center gap-3 mt-6">
            {currentStep > 1 && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-4 py-3 rounded-2xl font-bold text-sm transition-transform active:scale-95 rr-bg-navy" style={{ color: "oklch(0.70 0.04 260)", border: "1px solid oklch(0.35 0.06 260)" }}
              >
                <ChevronLeft size={16} />
                {t("onboardingWizard.navigation.previous")}
              </button>
            )}
            {currentStep < 3 && (
              <button
                onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-1 px-4 py-3 rounded-2xl font-bold text-sm transition-transform active:scale-95"
                style={{
                  background: "oklch(0.26 0.07 260)",
                  color: "oklch(0.75 0.04 260)",
                  border: "1px solid oklch(0.38 0.06 260)",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                {t("onboardingWizard.navigation.nextStep")}
                <ChevronRight size={16} />
              </button>
            )}
          </div>
          {/* Skip link */}
          {currentStep < 3 && (
            <button
              onClick={() => dismissMutation.mutate()}
              className="w-full text-center text-xs mt-3"
              style={{ color: "oklch(0.40 0.03 260)" }}
            >
              {t("onboardingWizard.navigation.skipSetupLater")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
