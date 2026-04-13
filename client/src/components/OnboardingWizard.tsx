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
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Mail,
  Globe,
  Rocket,
  CheckCircle2,
  X,
  ChevronRight,
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
  { value: "other", label: "Other" },
] as const;

const PLATFORM_PLACEHOLDERS: Record<string, string> = {
  google: "https://g.page/r/your-business/review",
  yelp: "https://www.yelp.com/writeareview/biz/your-business",
  tripadvisor: "https://www.tripadvisor.com/UserReviewEdit-...",
  facebook: "https://www.facebook.com/your-page/reviews",
  bing: "https://www.bingplaces.com/...",
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

const APP_PASSWORD_HINTS: Record<string, string> = {
  "gmail.com": "Gmail requires an App Password when 2-Step Verification is on. Go to myaccount.google.com → Security → App Passwords.",
  "googlemail.com": "Gmail requires an App Password when 2-Step Verification is on. Go to myaccount.google.com → Security → App Passwords.",
  "outlook.com": "Outlook may require an App Password if two-step verification is enabled. Go to account.microsoft.com → Security → Advanced security options.",
  "hotmail.com": "Outlook may require an App Password if two-step verification is enabled. Go to account.microsoft.com → Security → Advanced security options.",
  "yahoo.com": "Yahoo requires an App Password. Go to account.yahoo.com → Security → Generate app password.",
  "zoho.com": "Zoho requires SMTP access to be enabled first. Go to mail.zoho.com → Settings → Mail Accounts → SMTP and enable \"SMTP Access\".",
  "zohomail.com": "Zoho requires SMTP access to be enabled first. Go to mail.zoho.com → Settings → Mail Accounts → SMTP and enable \"SMTP Access\".",
};

// Preset SMTP configurations for one-tap selection in the advanced panel
const SMTP_PRESETS = [
  { label: "Google Workspace", host: "smtp.gmail.com", port: 587 },
  { label: "Outlook / Microsoft 365", host: "smtp-mail.outlook.com", port: 587 },
  { label: "Zoho Mail", host: "smtp.zoho.com", port: 587 },
  { label: "Yahoo Mail", host: "smtp.mail.yahoo.com", port: 587 },
] as const;

const GOOGLE_WORKSPACE_HINT = "Using Google Workspace? Your SMTP host is smtp.gmail.com (port 587). You'll need an App Password — go to myaccount.google.com → Security → App Passwords.";
const ZOHO_HOST_HINT = "Zoho requires SMTP access to be enabled first. Go to mail.zoho.com → Settings → Mail Accounts → SMTP and enable \"SMTP Access\". Then use your Zoho email and password here.";

function detectHost(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? KNOWN_HOSTS[domain] ?? null : null;
}

/** Returns the app-password hint based on email domain OR manually-entered host */
function getHint(email: string, host?: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  // Google Workspace: custom domain using smtp.gmail.com
  if (host === "smtp.gmail.com" && domain && !KNOWN_HOSTS[domain]) {
    return GOOGLE_WORKSPACE_HINT;
  }
  // Zoho: custom domain using smtp.zoho.com
  if (host === "smtp.zoho.com" && domain && domain !== "zoho.com" && domain !== "zohomail.com") {
    return ZOHO_HOST_HINT;
  }
  return domain ? APP_PASSWORD_HINTS[domain] ?? null : null;
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
      // Show inbox confirmation — welcome email fires server-side automatically
      toast.success(
        `Email connected! Check ${variables.email} — we sent you a test email to confirm everything works.`,
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

  const hint = getHint(email, host);
  const detectedAuto = !!detectHost(email);
  // Show Google Workspace disclosure when auto-detect fails and user has a custom domain
  const showWorkspaceDisclosure =
    !detectedAuto &&
    email.includes("@") &&
    !host && // hasn't manually set a host yet
    !!email.split("@")[1]; // has a domain

  async function handleTestCredentials() {
    if (!email || !password) {
      toast.error("Please enter your email and password.");
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
      const message = err instanceof Error ? err.message : "Connection test failed";
      setTestResult({ ok: false, error: message });
    } finally {
      setTestingCredentials(false);
    }
  }

  async function handleConnect() {
    if (!email || !password) {
      toast.error("Please enter your email and password.");
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
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourbusiness.com"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{
            background: "oklch(0.18 0.06 260)",
            color: "white",
            border: "1px solid oklch(0.32 0.06 260)",
          }}
        />
      </div>

      <div>
        <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.70 0.04 260)" }}>
          Password {hint ? "(App Password required)" : ""}
        </label>
        <div className="relative">
          <input
            type={showPass ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={hint ? "16-character app password" : "Your email password"}
            className="w-full px-4 py-3 pr-10 rounded-xl text-sm outline-none"
            style={{
              background: "oklch(0.18 0.06 260)",
              color: "white",
              border: "1px solid oklch(0.32 0.06 260)",
            }}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: "oklch(0.55 0.04 260)" }}
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {hint && (
          <div
            className="flex items-start gap-2 mt-2 px-3 py-2 rounded-lg"
            style={{ background: "oklch(0.22 0.08 80)", color: "oklch(0.80 0.18 80)" }}
          >
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <p className="text-xs">{hint}</p>
          </div>
        )}
      </div>

      {/* From Name — promoted to main form */}
      <div>
        <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.70 0.04 260)" }}>
          Your Name <span style={{ color: "oklch(0.55 0.04 260)", fontWeight: 400 }}>(shown as sender)</span>
        </label>
        <input
          type="text"
          value={fromName}
          onChange={(e) => setFromName(e.target.value)}
          placeholder="e.g. Steve at Acme Plumbing"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{
            background: "oklch(0.18 0.06 260)",
            color: "white",
            border: "1px solid oklch(0.32 0.06 260)",
          }}
        />
        <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.04 260)" }}>
          Customers will see this as the sender name in their inbox.
        </p>
      </div>
      {/* Reply-To — optional */}
      <div>
        <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.70 0.04 260)" }}>
          Reply-To <span style={{ color: "oklch(0.55 0.04 260)", fontWeight: 400 }}>(optional)</span>
        </label>
        <input
          type="email"
          value={replyTo}
          onChange={(e) => setReplyTo(e.target.value)}
          placeholder="e.g. support@yourbusiness.com"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{
            background: "oklch(0.18 0.06 260)",
            color: "white",
            border: "1px solid oklch(0.32 0.06 260)",
          }}
        />
        <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.04 260)" }}>
          Where customer replies will go. Leave blank to use your sending address.
        </p>
      </div>
      {detectedAuto && (
        <p className="text-xs" style={{ color: "oklch(0.55 0.18 145)" }}>
          ✓ SMTP settings auto-detected for {email.split("@")[1]}
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
              Using Google Workspace or a custom domain?
            </p>
            <p className="text-xs" style={{ color: "oklch(0.70 0.05 250)" }}>
              We couldn’t auto-detect your SMTP settings. Select your email provider below or enter settings manually.
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
          {showAdvanced ? "▲ Hide" : "▼ Show"} advanced SMTP settings
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
                SMTP Host
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder={`smtp.${email.split("@")[1] ?? "yourdomain.com"}`}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{
                  background: "oklch(0.18 0.06 260)",
                  color: "white",
                  border: "1px solid oklch(0.32 0.06 260)",
                }}
              />
            </div>
            <div className="w-24">
              <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.70 0.04 260)" }}>
                Port
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{
                  background: "oklch(0.18 0.06 260)",
                  color: "white",
                  border: "1px solid oklch(0.32 0.06 260)",
                }}
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
          <span>{testResult.ok ? "Connection successful! You can now click Connect Email." : (testResult.error ?? "Connection failed. Check your credentials and settings.")}</span>
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
            <><Loader2 size={14} className="animate-spin" />Testing...</>
          ) : (
            <>Test Connection</>
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
            <><Loader2 size={16} className="animate-spin" />Connecting...</>
          ) : (
            <><Mail size={16} />Connect Email</>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Add Review Platform ────────────────────────────────────────────────

function Step2Platform({ onDone }: { onDone: () => void }) {
  const utils = trpc.useUtils();
  const [platform, setPlatform] = useState<string>("google");
  const [url, setUrl] = useState("");

  const addPlatform = trpc.reviewPlatforms.add.useMutation({
    onSuccess: () => {
      utils.reviewPlatforms.list.invalidate();
      utils.onboarding.status.invalidate();
      toast.success("Review platform added!");
      setTimeout(onDone, 800);
    },
    onError: (err) => toast.error(err.message),
  });

  function handleAdd() {
    if (!url.trim()) {
      toast.error("Please enter your review page URL.");
      return;
    }
    addPlatform.mutate({
      platform: platform as "google" | "yelp" | "tripadvisor" | "bing" | "facebook" | "other",
      url: url.trim(),
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.70 0.04 260)" }}>
          Review Platform
        </label>
        <select
          value={platform}
          onChange={(e) => { setPlatform(e.target.value); setUrl(""); }}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none"
          style={{
            background: "oklch(0.18 0.06 260)",
            color: "white",
            border: "1px solid oklch(0.32 0.06 260)",
          }}
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
          Your Review Page URL
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={PLATFORM_PLACEHOLDERS[platform]}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{
            background: "oklch(0.18 0.06 260)",
            color: "white",
            border: "1px solid oklch(0.32 0.06 260)",
          }}
        />
        <p className="text-xs mt-1" style={{ color: "oklch(0.50 0.03 260)" }}>
          Paste the link customers click to leave you a review.
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
            Saving...
          </>
        ) : (
          <>
            <Globe size={16} />
            Save Platform
          </>
        )}
      </button>
    </div>
  );
}

// ── Step 3: Send First Request ─────────────────────────────────────────────────

function Step3Send({ onDismiss }: { onDismiss: () => void }) {
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
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ background: "oklch(0.22 0.09 260)" }}
      >
        <Rocket size={36} style={{ color: "oklch(0.80 0.18 80)" }} />
      </div>
      <div>
        <h3
          className="text-xl font-black mb-2"
          style={{ color: "white", fontFamily: "'Poppins', sans-serif" }}
        >
          You're all set!
        </h3>
        <p className="text-sm" style={{ color: "oklch(0.65 0.04 260)" }}>
          Your email is connected and your review platform is ready. Send your first review request
          and start building your reputation.
        </p>
      </div>
      <button
        onClick={handleGoSend}
        className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-base transition-transform active:scale-95 w-full"
        style={{
          background: "oklch(0.80 0.18 80)",
          color: "oklch(0.15 0.05 260)",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        <Rocket size={18} />
        Send My First Review Request
      </button>
    </div>
  );
}

// ── Main Wizard ────────────────────────────────────────────────────────────────

export default function OnboardingWizard({ onDismiss }: OnboardingWizardProps) {
  const { data: status, isLoading } = trpc.onboarding.status.useQuery(undefined, {
    refetchInterval: 3000, // poll so steps auto-advance when completed elsewhere
  });

  const dismissMutation = trpc.onboarding.dismiss.useMutation({
    onSuccess: onDismiss,
  });

  // Derive current step from server state
  const currentStep = !status?.smtpConnected ? 1 : !status?.hasPlatform ? 2 : 3;

  const steps = [
    { id: 1, label: "Connect Email", icon: Mail, done: !!status?.smtpConnected },
    { id: 2, label: "Review Platform", icon: Globe, done: !!status?.hasPlatform },
    { id: 3, label: "Send Request", icon: Rocket, done: !!status?.hasSentRequest },
  ];

  function handleStepDone() {
    // status will auto-refresh via refetchInterval — no manual advance needed
  }

  if (isLoading) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{ background: "oklch(0.14 0.05 260)" }}
      >
        {/* Header */}
        <div
          className="px-6 pt-6 pb-4"
          style={{ background: "oklch(0.22 0.09 260)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Rocket size={18} style={{ color: "oklch(0.80 0.18 80)" }} />
              <span
                className="text-xs font-bold tracking-widest uppercase"
                style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Poppins', sans-serif" }}
              >
                ReviewLink Setup
              </span>
            </div>
            <button
              onClick={() => dismissMutation.mutate()}
              className="p-1 rounded-lg transition-colors"
              style={{ color: "oklch(0.55 0.04 260)" }}
              title="Skip setup"
            >
              <X size={18} />
            </button>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2">
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-center gap-2 flex-1">
                <StepDot step={step.id} current={currentStep} done={step.done} />
                <div className="flex-1">
                  <p
                    className="text-xs font-bold"
                    style={{
                      color:
                        step.done
                          ? "oklch(0.55 0.18 145)"
                          : step.id === currentStep
                          ? "white"
                          : "oklch(0.45 0.03 260)",
                    }}
                  >
                    {step.label}
                  </p>
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight size={14} style={{ color: "oklch(0.35 0.04 260)" }} />
                )}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div
            className="mt-4 h-1 rounded-full overflow-hidden"
            style={{ background: "oklch(0.28 0.06 260)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${((currentStep - 1) / 3) * 100}%`,
                background: "oklch(0.80 0.18 80)",
              }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="px-6 py-6">
          {/* Step title */}
          <div className="mb-5">
            <h2
              className="text-lg font-black mb-1"
              style={{ color: "white", fontFamily: "'Poppins', sans-serif" }}
            >
              {currentStep === 1 && "Connect your email"}
              {currentStep === 2 && "Add your review page"}
              {currentStep === 3 && "Ready to launch 🚀"}
            </h2>
            <p className="text-sm" style={{ color: "oklch(0.60 0.04 260)" }}>
              {currentStep === 1 &&
                "ReviewLink sends emails from your own account — works with Gmail, Outlook, Yahoo, or any business email."}
              {currentStep === 2 &&
                "Paste the link where customers can leave you a review. You can add more platforms in Settings later."}
              {currentStep === 3 &&
                "Everything is set up. Send your first review request in seconds."}
            </p>
          </div>

          {currentStep === 1 && <Step1Email onDone={handleStepDone} />}
          {currentStep === 2 && <Step2Platform onDone={handleStepDone} />}
          {currentStep === 3 && <Step3Send onDismiss={onDismiss} />}

          {/* Skip link */}
          {currentStep < 3 && (
            <button
              onClick={() => dismissMutation.mutate()}
              className="w-full text-center text-xs mt-4"
              style={{ color: "oklch(0.45 0.03 260)" }}
            >
              Skip setup — I'll do this later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
