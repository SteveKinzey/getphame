/**
 * AppleAuthLanding — intermediate page after Apple Sign In callback.
 *
 * Apple's form_post comes from appleid.apple.com (cross-origin). Some browsers
 * (Safari ITP, Firefox ETP) may not send the session cookie on the immediate
 * redirect. By landing on a same-origin page first and doing a client-side
 * navigation, we ensure the cookie is treated as first-party on the next request.
 *
 * Flow:
 *   Apple → POST /api/auth/apple/callback (sets cookie, redirects to /auth/apple/landing?return=/)
 *   → This page loads, reads ?return param, navigates to it
 *   → useAuth() now sees the session cookie correctly
 */
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

function safeAppleReturnPath(value: string | null): string {
  if (!value) return "/";
  if (
    value === "/" ||
    value === "/onboarding" ||
    value === "/settings?passkey_enroll=1"
  )
    return value;
  return "/";
}

export default function AppleAuthLanding() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnPath = safeAppleReturnPath(params.get("return"));
    // Small delay to ensure cookie is committed before navigation
    const timer = setTimeout(() => {
      window.location.replace(returnPath);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="mobile-screen flex items-center justify-center rr-bg-navy">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-white" size={32} />
        <p className="text-white font-bold text-base">Signing you in…</p>
      </div>
    </div>
  );
}
