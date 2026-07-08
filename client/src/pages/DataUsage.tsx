import { useLocation } from "wouter";
import { ArrowLeft, CheckCircle, XCircle, Shield, Lock, Eye } from "lucide-react";

const SECTION_HEADING = "text-base font-bold mb-3";
const SECTION_HEADING_STYLE = { fontFamily: "'Poppins', sans-serif", color: "oklch(0.90 0.02 260)" };
const BODY_STYLE = { color: "oklch(0.78 0.02 260)" };
const LINK_STYLE = { color: "oklch(0.80 0.18 80)" };

export default function DataUsage() {
  const [, navigate] = useLocation();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/");
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="container py-10">
        <div className="flex items-center gap-3 mb-2">
          <Shield size={24} style={{ color: "oklch(0.80 0.18 80)" }} />
          <h1 className="text-3xl md:text-4xl font-display font-extrabold text-white">
            Data Usage &amp; Google OAuth
          </h1>
        </div>
        <p className="text-sm" style={{ color: "oklch(0.55 0.04 260)" }}>
          Last updated: July 2026
        </p>
        <p className="mt-3 text-sm leading-relaxed max-w-2xl" style={BODY_STYLE}>
          This page explains exactly what data GetPhame accesses when you sign in with Google,
          why each piece of information is needed, and what we explicitly do not access.
        </p>
      </div>

      <div className="container pb-16 max-w-3xl">

        {/* What is GetPhame */}
        <section className="mb-8">
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>
            What is GetPhame?
          </h2>
          <p className="text-sm leading-relaxed" style={BODY_STYLE}>
            GetPhame is a review request tool for local businesses. It allows business owners to
            send personalized review request emails to their customers from their own email account
            (Gmail, Outlook, or any SMTP provider). The goal is to help businesses collect more
            5-star reviews on Google, Yelp, TripAdvisor, and other platforms — without awkward
            in-person asks.
          </p>
          <p className="mt-3 text-sm leading-relaxed" style={BODY_STYLE}>
            GetPhame does <strong>not</strong> send emails through Google's servers. It uses your
            own SMTP credentials (a separate setup step) to send emails directly from your email
            account. Google Sign-In is used only for account creation and authentication.
          </p>
        </section>

        {/* OAuth Scopes */}
        <section className="mb-8">
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>
            Google OAuth Scopes We Request
          </h2>
          <p className="text-sm mb-4 leading-relaxed" style={BODY_STYLE}>
            When you click "Sign in with Google," we request the following three OAuth scopes:
          </p>

          <div className="space-y-4">
            {/* openid */}
            <div
              className="rounded-xl p-4 border"
              style={{ background: "oklch(0.15 0.05 260)", borderColor: "oklch(0.28 0.08 260)" }}
            >
              <div className="flex items-start gap-3">
                <Lock size={18} className="mt-0.5 shrink-0" style={{ color: "oklch(0.50 0.18 260)" }} />
                <div>
                  <p className="text-sm font-bold mb-1" style={SECTION_HEADING_STYLE}>
                    <code className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: "oklch(0.20 0.06 260)", color: "oklch(0.80 0.18 80)" }}>openid</code>
                    {" "}— Authentication
                  </p>
                  <p className="text-sm leading-relaxed" style={BODY_STYLE}>
                    This is the base scope required for Google Sign-In. It allows Google to confirm
                    your identity and issue a secure token that proves you are who you say you are.
                    It does not give us access to any content in your Google account.
                  </p>
                  <p className="text-xs mt-2 font-semibold" style={{ color: "oklch(0.45 0.15 145)" }}>
                    Data accessed: A unique identifier for your Google account (used internally to
                    link your GetPhame account to your Google identity).
                  </p>
                </div>
              </div>
            </div>

            {/* email */}
            <div
              className="rounded-xl p-4 border"
              style={{ background: "oklch(0.15 0.05 260)", borderColor: "oklch(0.28 0.08 260)" }}
            >
              <div className="flex items-start gap-3">
                <Eye size={18} className="mt-0.5 shrink-0" style={{ color: "oklch(0.50 0.18 260)" }} />
                <div>
                  <p className="text-sm font-bold mb-1" style={SECTION_HEADING_STYLE}>
                    <code className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: "oklch(0.20 0.06 260)", color: "oklch(0.80 0.18 80)" }}>email</code>
                    {" "}— Your Email Address
                  </p>
                  <p className="text-sm leading-relaxed" style={BODY_STYLE}>
                    We request your Google account email address to use as your GetPhame login
                    identifier and to send you transactional emails (account confirmations, billing
                    receipts, and important service notifications). We do not use your email address
                    for marketing without your explicit consent.
                  </p>
                  <p className="text-xs mt-2 font-semibold" style={{ color: "oklch(0.45 0.15 145)" }}>
                    Data accessed: Your Google account email address (e.g., you@gmail.com).
                    Stored in our database as your account identifier.
                  </p>
                </div>
              </div>
            </div>

            {/* profile */}
            <div
              className="rounded-xl p-4 border"
              style={{ background: "oklch(0.15 0.05 260)", borderColor: "oklch(0.28 0.08 260)" }}
            >
              <div className="flex items-start gap-3">
                <Eye size={18} className="mt-0.5 shrink-0" style={{ color: "oklch(0.50 0.18 260)" }} />
                <div>
                  <p className="text-sm font-bold mb-1" style={SECTION_HEADING_STYLE}>
                    <code className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: "oklch(0.20 0.06 260)", color: "oklch(0.80 0.18 80)" }}>profile</code>
                    {" "}— Your Display Name
                  </p>
                  <p className="text-sm leading-relaxed" style={BODY_STYLE}>
                    We request your Google profile name to pre-fill your GetPhame account display
                    name. This is the name shown in your account settings and used as the default
                    "From" name on review request emails until you customize it. You can change
                    this name at any time in Settings.
                  </p>
                  <p className="text-xs mt-2 font-semibold" style={{ color: "oklch(0.45 0.15 145)" }}>
                    Data accessed: Your full name as set in your Google account (e.g., "Jane Smith").
                    Stored in our database as your account display name.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What we DO NOT access */}
        <section className="mb-8">
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>
            What We Do NOT Access
          </h2>
          <p className="text-sm mb-4 leading-relaxed" style={BODY_STYLE}>
            GetPhame does not request and has no access to any of the following Google services
            or data:
          </p>
          <div className="space-y-2">
            {[
              "Your Gmail inbox, sent mail, drafts, or any email content",
              "Your Google Drive files, documents, or spreadsheets",
              "Your Google Calendar events or schedule",
              "Your Google Contacts list",
              "Your Google Photos or any media",
              "Your Google account password",
              "Any Google Workspace data (Docs, Sheets, Slides, Meet, etc.)",
              "Your location history or Google Maps data",
              "Your YouTube history or subscriptions",
              "Any Google Search history",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <XCircle size={16} className="mt-0.5 shrink-0" style={{ color: "oklch(0.55 0.20 25)" }} />
                <p className="text-sm" style={BODY_STYLE}>{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What we DO store */}
        <section className="mb-8">
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>
            What We Store From Google Sign-In
          </h2>
          <div className="space-y-2">
            {[
              "Your Google account unique ID (used internally to identify your account)",
              "Your email address (used as your login identifier and for transactional emails)",
              "Your display name (pre-filled as your account name — editable at any time)",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <CheckCircle size={16} className="mt-0.5 shrink-0" style={{ color: "oklch(0.45 0.15 145)" }} />
                <p className="text-sm" style={BODY_STYLE}>{item}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-relaxed" style={BODY_STYLE}>
            We do not store your Google OAuth access token or refresh token after the initial
            sign-in handshake is complete. Once your GetPhame session is established, all
            subsequent authentication uses our own session cookie — not Google's token.
          </p>
        </section>

        {/* Data deletion */}
        <section className="mb-8">
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>
            Deleting Your Data
          </h2>
          <p className="text-sm leading-relaxed" style={BODY_STYLE}>
            You can request complete deletion of your GetPhame account and all associated data
            at any time by emailing{" "}
            <a href="mailto:support@getphame.app" style={LINK_STYLE} className="underline">
              support@getphame.app
            </a>
            . We will permanently delete your account, email address, display name, business
            profile, customer contacts, and all email tracking records within 30 days of your
            request.
          </p>
          <p className="mt-3 text-sm leading-relaxed" style={BODY_STYLE}>
            Revoking GetPhame's access in your{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              style={LINK_STYLE}
              className="underline"
            >
              Google Account Permissions
            </a>{" "}
            will prevent future sign-ins but does not delete data already stored in GetPhame.
            To delete stored data, please contact us directly.
          </p>
        </section>

        {/* Contact */}
        <section className="mb-8">
          <h2 className={SECTION_HEADING} style={SECTION_HEADING_STYLE}>
            Questions?
          </h2>
          <p className="text-sm leading-relaxed" style={BODY_STYLE}>
            If you have any questions about how GetPhame uses your Google account data, please
            contact us at{" "}
            <a href="mailto:support@getphame.app" style={LINK_STYLE} className="underline">
              support@getphame.app
            </a>
            . For our full privacy policy, see{" "}
            <a href="/privacy-policy" style={LINK_STYLE} className="underline">
              Privacy Policy
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
