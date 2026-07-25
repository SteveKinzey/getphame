import { useLocation } from "wouter";
import { Shield, AlertTriangle, Clock, CheckCircle, RefreshCw, Lock } from "lucide-react";

const SECTION_HEADING = "text-base font-bold mt-6 mb-2";
const SECTION_HEADING_STYLE = { fontFamily: "'Poppins', sans-serif", color: "oklch(0.90 0.02 260)" };
const BODY_STYLE = { color: "oklch(0.84 0.02 260)" };
const LINK_STYLE = { color: "oklch(0.86 0.16 80)" };
const GOLD = "oklch(0.80 0.18 80)";
const ACCENT_BORDER = { borderColor: GOLD };

const LAST_UPDATED = "July 2026";
const SECURITY_EMAIL = "security@getphame.app";

export default function SecurityPolicy() {
  const [, navigate] = useLocation();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen rr-bg-navy text-slate-100">
      {/* Page header */}
      <div className="container py-10">
        <div className="flex items-center gap-3 mb-3">
          <Shield size={28} style={{ color: GOLD }} />
          <h1 className="text-3xl md:text-4xl font-display font-extrabold text-white">
            Security Policy
          </h1>
        </div>
        <p className="text-sm text-slate-200">
          Last updated: {LAST_UPDATED}
        </p>
      </div>

      {/* Body */}
      <div className="container pb-16 max-w-3xl space-y-7 text-sm leading-relaxed" style={BODY_STYLE}>

        {/* Intro */}
        <section>
          <p className="mb-3">
            GetPhame (operated by SK America LLC) takes the security of its platform and customer data seriously. This document describes our vulnerability management process, our automated security controls, and how to responsibly disclose a security issue.
          </p>
          <p>
            We follow a layered defence approach: automated dependency auditing on every build, monthly automated patch reviews, and a defined CVE response SLA for production issues.
          </p>
        </section>

        {/* Automated CI Gate */}
        <section>
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>
            <span className="inline-flex items-center gap-2"><CheckCircle size={16} style={{ color: GOLD }} /> Automated Security Gate on Every Build</span>
          </h2>
          <p className="mb-3">
            Every production deployment is gated by a three-step CI pipeline that runs automatically before any code is compiled:
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              <strong style={{ color: "oklch(0.90 0.02 260)" }}>Production dependency audit</strong> — <code className="text-xs px-1 py-0.5 rounded" style={{ background: "oklch(0.18 0.04 260)", color: GOLD }}>pnpm audit --prod</code> scans every package shipped to end users. If any known vulnerability is found, the build exits with a non-zero code and deployment is blocked.
            </li>
            <li>
              <strong style={{ color: "oklch(0.90 0.02 260)" }}>Full test suite</strong> — <code className="text-xs px-1 py-0.5 rounded" style={{ background: "oklch(0.18 0.04 260)", color: GOLD }}>pnpm test</code> runs all 54 unit tests covering authentication, email delivery, Stripe checkout, and API contracts. A single failing test blocks deployment.
            </li>
            <li>
              <strong style={{ color: "oklch(0.90 0.02 260)" }}>Compiled build verification</strong> — TypeScript is compiled to production bundles; any type error or import failure also blocks deployment.
            </li>
          </ol>
          <p className="mt-3">
            This means it is <em>structurally impossible</em> to deploy a build that contains a known production CVE or a broken test.
          </p>
        </section>

        {/* Monthly Review */}
        <section>
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>
            <span className="inline-flex items-center gap-2"><RefreshCw size={16} style={{ color: GOLD }} /> Monthly Automated Dependency Review</span>
          </h2>
          <p className="mb-3">
            On the 1st of every month, an automated agent runs a full dependency security review:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Pulls the latest codebase and runs <code className="text-xs px-1 py-0.5 rounded" style={{ background: "oklch(0.18 0.04 260)", color: GOLD }}>pnpm install</code></li>
            <li>Runs <code className="text-xs px-1 py-0.5 rounded" style={{ background: "oklch(0.18 0.04 260)", color: GOLD }}>pnpm audit --prod</code> and <code className="text-xs px-1 py-0.5 rounded" style={{ background: "oklch(0.18 0.04 260)", color: GOLD }}>pnpm audit</code> (full, including dev tools)</li>
            <li>Attempts to fix any production CVEs via <code className="text-xs px-1 py-0.5 rounded" style={{ background: "oklch(0.18 0.04 260)", color: GOLD }}>pnpm update</code> or dependency overrides</li>
            <li>Runs the full test suite and build to confirm no regressions</li>
            <li>Commits and pushes any fixes to the main branch with a <code className="text-xs px-1 py-0.5 rounded" style={{ background: "oklch(0.18 0.04 260)", color: GOLD }}>chore: monthly dependency security update</code> commit</li>
          </ul>
          <p className="mt-3">
            In addition, <strong style={{ color: "oklch(0.90 0.02 260)" }}>GitHub Dependabot</strong> monitors all production and development dependencies continuously and opens pull requests for patch and minor upgrades within 24–48 hours of a new CVE advisory being published.
          </p>
        </section>

        {/* CVE Response SLA */}
        <section>
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>
            <span className="inline-flex items-center gap-2"><Clock size={16} style={{ color: GOLD }} /> CVE Response SLA</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse mt-2">
              <thead>
                <tr style={{ background: "oklch(0.18 0.04 260)" }}>
                  <th className="text-left px-3 py-2 font-semibold" style={{ color: "oklch(0.90 0.02 260)" }}>Severity</th>
                  <th className="text-left px-3 py-2 font-semibold" style={{ color: "oklch(0.90 0.02 260)" }}>Scope</th>
                  <th className="text-left px-3 py-2 font-semibold" style={{ color: "oklch(0.90 0.02 260)" }}>Target Patch Time</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderTop: "1px solid oklch(0.25 0.04 260)" }}>
                  <td className="px-3 py-2 font-medium" style={{ color: "#ef4444" }}>Critical / High</td>
                  <td className="px-3 py-2">Production dependencies</td>
                  <td className="px-3 py-2">Within 48 hours of advisory</td>
                </tr>
                <tr style={{ borderTop: "1px solid oklch(0.25 0.04 260)" }}>
                  <td className="px-3 py-2 font-medium" style={{ color: "#f97316" }}>Moderate</td>
                  <td className="px-3 py-2">Production dependencies</td>
                  <td className="px-3 py-2">Within 7 days</td>
                </tr>
                <tr style={{ borderTop: "1px solid oklch(0.25 0.04 260)" }}>
                  <td className="px-3 py-2 font-medium" style={{ color: "#eab308" }}>Any</td>
                  <td className="px-3 py-2">Dev-only tools (never shipped)</td>
                  <td className="px-3 py-2">Next monthly review cycle</td>
                </tr>
                <tr style={{ borderTop: "1px solid oklch(0.25 0.04 260)" }}>
                  <td className="px-3 py-2 font-medium text-slate-200">Low</td>
                  <td className="px-3 py-2">Any</td>
                  <td className="px-3 py-2">Next monthly review cycle</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Current Status */}
        <section>
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>
            <span className="inline-flex items-center gap-2"><Shield size={16} style={{ color: GOLD }} /> Current Security Status</span>
          </h2>
          <div className="rounded-lg p-4 mt-2" style={{ background: "oklch(0.18 0.04 260)", border: "1px solid oklch(0.25 0.04 260)" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#22c55e" }} />
              <span className="font-semibold text-xs" style={{ color: "#22c55e" }}>PRODUCTION DEPENDENCIES — CLEAN</span>
            </div>
            <p className="text-xs" style={{ color: "oklch(0.65 0.02 260)" }}>
              <code className="px-1 py-0.5 rounded" style={{ background: "oklch(0.22 0.04 260)", color: GOLD }}>pnpm audit --prod</code> reports zero known vulnerabilities. Last verified: {LAST_UPDATED}.
            </p>
            <p className="mt-2 text-xs text-slate-200">
              1 moderate finding exists in a dev-only migration tool (<code className="px-1 py-0.5 rounded" style={{ background: "oklch(0.22 0.04 260)", color: GOLD }}>drizzle-kit → @esbuild-kit/core-utils → esbuild ≤0.24.2</code>) that is never compiled into the production bundle and poses no runtime risk.
            </p>
          </div>
        </section>

        {/* Data Security */}
        <section>
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>
            <span className="inline-flex items-center gap-2"><Lock size={16} style={{ color: GOLD }} /> Data Security Practices</span>
          </h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong style={{ color: "oklch(0.90 0.02 260)" }}>SMTP credentials</strong> are encrypted at rest using AES-256-GCM before storage. The encryption key is never stored alongside the ciphertext.</li>
            <li><strong style={{ color: "oklch(0.90 0.02 260)" }}>Session tokens</strong> are signed JWTs with short expiry, stored in HttpOnly cookies to prevent XSS access.</li>
            <li><strong style={{ color: "oklch(0.90 0.02 260)" }}>Customer data</strong> (email addresses you upload) is stored in Supabase PostgreSQL with TLS-enforced connections.</li>
            <li><strong style={{ color: "oklch(0.90 0.02 260)" }}>File storage</strong> uses S3-compatible object storage with non-enumerable, randomised key paths.</li>
            <li><strong style={{ color: "oklch(0.90 0.02 260)" }}>Payment processing</strong> is handled by Stripe and PayPal. GetPhame never stores raw card numbers, CVVs, or PayPal credentials.</li>
            <li><strong style={{ color: "oklch(0.90 0.02 260)" }}>OAuth</strong> (Google, Apple) credentials are never stored; only a platform-issued session token is persisted.</li>
          </ul>
        </section>

        {/* Responsible Disclosure */}
        <section>
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>
            <span className="inline-flex items-center gap-2"><AlertTriangle size={16} style={{ color: GOLD }} /> Responsible Disclosure</span>
          </h2>
          <p className="mb-3">
            If you discover a security vulnerability in GetPhame, please report it privately before public disclosure. We commit to:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mb-3">
            <li>Acknowledge your report within <strong style={{ color: "oklch(0.90 0.02 260)" }}>24 hours</strong></li>
            <li>Provide a status update within <strong style={{ color: "oklch(0.90 0.02 260)" }}>72 hours</strong></li>
            <li>Patch critical/high issues within <strong style={{ color: "oklch(0.90 0.02 260)" }}>48 hours</strong> of confirmation</li>
            <li>Credit you in our changelog (unless you prefer anonymity)</li>
          </ul>
          <div className="rounded-lg p-4" style={{ background: "oklch(0.18 0.04 260)", border: "1px solid oklch(0.25 0.04 260)" }}>
            <p className="font-semibold mb-2" style={{ color: "oklch(0.90 0.02 260)" }}>Report a Vulnerability</p>
            <p className="mb-1 text-xs font-semibold" style={{ color: GOLD }}>Option 1 — GitHub Private Advisory (preferred)</p>
            <p className="mb-3">
              <a
                href="https://github.com/SteveKinzey/getphame/security/advisories/new"
                target="_blank"
                rel="noopener noreferrer"
                style={LINK_STYLE}
                className="underline underline-offset-4 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1628]"
              >
                Submit a private security advisory on GitHub
              </a>
              {" "}— visible only to maintainers, no public exposure.
            </p>
            <p className="mb-1 text-xs font-semibold" style={{ color: GOLD }}>Option 2 — Email</p>
            <p>
              <a href={`mailto:${SECURITY_EMAIL}`} style={LINK_STYLE} className="break-all underline underline-offset-4 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1628]">
                {SECURITY_EMAIL}
              </a>
            </p>
            <p className="mt-3 text-xs text-slate-200">
              Please include a description of the vulnerability, steps to reproduce, and your assessment of impact. Do not include sensitive customer data in your report.
            </p>
          </div>
        </section>

        {/* Scope */}
        <section>
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>Scope</h2>
          <p className="mb-2">In scope for responsible disclosure:</p>
          <ul className="list-disc pl-5 space-y-1 mb-3">
            <li>getphame.app and all subdomains</li>
            <li>The GetPhame web application and its API</li>
            <li>Authentication flows (Google OAuth, Apple Sign In, magic links)</li>
            <li>Data handling and storage</li>
          </ul>
          <p className="mb-2">Out of scope:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Denial of service attacks</li>
            <li>Social engineering of staff</li>
            <li>Physical security</li>
            <li>Third-party services (Stripe, Google, Apple) — report those directly to the vendor</li>
          </ul>
        </section>

        {/* Footer note */}
        <section>
          <p className="text-xs text-slate-200">
            This security policy applies to the GetPhame platform operated by SK America LLC. It is reviewed and updated at least quarterly. Questions about this policy may be directed to{" "}
            <a href={`mailto:${SECURITY_EMAIL}`} style={LINK_STYLE} className="underline underline-offset-4 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1628]">{SECURITY_EMAIL}</a>.
          </p>
        </section>

      </div>
    </div>
  );
}
