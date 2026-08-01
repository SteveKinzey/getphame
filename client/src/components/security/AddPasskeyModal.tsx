import { useState } from "react";
import { Apple, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import MagicLinkForm from "@/components/auth/MagicLinkForm";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { hashPasskeyEnrollmentEmail, PASSKEY_ENROLLMENT_INTENT, rememberPasskeyEnrollmentEmail, type PasskeyEnrollmentReturnError } from "@/lib/passkeyEnrollment";
import { isGoogleSignInHost, isStagingSocialLoginHost } from "@/lib/socialLoginAvailability";
import { useUpdateCriticalActivity } from "@/contexts/UpdateSafetyContext";

interface Props {
  open: boolean;
  email: string;
  onOpenChange: (open: boolean) => void;
  verificationError?: PasskeyEnrollmentReturnError | null;
}

export default function AddPasskeyModal({ open, email, onOpenChange, verificationError = null }: Props) {
  const { t } = useTranslation();
  const [openingProvider, setOpeningProvider] = useState<"google" | "apple" | null>(null);
  useUpdateCriticalActivity(
    "passkey-provider-verification",
    Boolean(openingProvider),
  );
  const googleAvailable = isGoogleSignInHost(window.location.hostname);
  const appleAvailable = isStagingSocialLoginHost(window.location.hostname);

  async function verifyWithProvider(provider: "google" | "apple") {
    if (openingProvider) return;
    setOpeningProvider(provider);
    rememberPasskeyEnrollmentEmail(email);
    try {
      const emailHash = await hashPasskeyEnrollmentEmail(email);
      const params = new URLSearchParams({ intent: PASSKEY_ENROLLMENT_INTENT, expected_email_hash: emailHash });
      window.location.assign(`/api/auth/${provider}?${params.toString()}`);
    } catch {
      setOpeningProvider(null);
    }
  }

  const recoveryMessage = verificationError === "provider_email_mismatch"
    ? t("passkeys.enrollment.providerMismatch", { defaultValue: "That provider verified a different email. Choose the account shown below or verify with its email link." })
    : verificationError === "provider_verification_cancelled"
      ? t("passkeys.enrollment.providerCancelled", { defaultValue: "Verification was cancelled. Your passkey has not been added, and you can try again safely." })
      : null;

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent data-testid="add-passkey-modal" className="w-[calc(100%-2rem)] max-w-md bg-[#0F1B2D] text-white sm:w-full">
      <DialogHeader>
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><KeyRound size={21} aria-hidden="true" /></div>
        <DialogTitle className="text-left text-white">{t("passkeys.enrollment.title", { defaultValue: "Add a passkey" })}</DialogTitle>
        <DialogDescription className="text-left text-white/70">{t("passkeys.enrollment.description", { defaultValue: "Verify this Get Phame account first. Then your device will ask for a fingerprint, face, or screen lock to create the passkey." })}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"><p className="text-xs font-semibold text-white/55">{t("passkeys.enrollment.accountLabel", { defaultValue: "Passkey for" })}</p><p className="mt-1 break-all text-sm font-bold text-primary">{email}</p></div>
        {recoveryMessage && <p role="alert" className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100">{recoveryMessage}</p>}
        <MagicLinkForm idPrefix="passkey-enrollment" initialEmail={email} lockEmail intent={PASSKEY_ENROLLMENT_INTENT} />
        {(googleAvailable || appleAvailable) && <div className="space-y-3 border-t border-white/10 pt-4">
          <p className="text-center text-xs font-semibold text-white/50">{t("passkeys.enrollment.orProvider", { defaultValue: "or verify with" })}</p>
          {googleAvailable && <button type="button" onClick={() => void verifyWithProvider("google")} disabled={Boolean(openingProvider)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-900 transition-[filter,transform] hover:brightness-95 active:scale-[0.97] disabled:opacity-60">{openingProvider === "google" ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <ShieldCheck size={17} aria-hidden="true" />}{t("passkeys.enrollment.verifyGoogle", { defaultValue: "Verify with Google" })}</button>}
          {appleAvailable && <button type="button" onClick={() => void verifyWithProvider("apple")} disabled={Boolean(openingProvider)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-black px-4 text-sm font-bold text-white transition-[filter,transform] hover:brightness-125 active:scale-[0.97] disabled:opacity-60">{openingProvider === "apple" ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Apple size={17} aria-hidden="true" />}{t("passkeys.enrollment.verifyApple", { defaultValue: "Verify with Apple" })}</button>}
        </div>}
        <p className="text-xs leading-relaxed text-white/50">{t("passkeys.enrollment.privacy", { defaultValue: "Verification only confirms the account. Get Phame never receives your fingerprint, face scan, or device unlock code." })}</p>
      </div>
    </DialogContent>
  </Dialog>;
}
