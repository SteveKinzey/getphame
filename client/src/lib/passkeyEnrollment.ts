export const PASSKEY_ENROLLMENT_INTENT = "enroll_passkey" as const;

const EMAIL_KEY = "getphame:passkey-enrollment-email";
const LEGACY_UNENROLLED_MESSAGE = "Passkey sign-in is unavailable for this account";

export type PasskeyEnrollmentReturnError = "provider_email_mismatch" | "provider_verification_cancelled";

export function isPasskeyEnrollmentRequiredResult(value: unknown): value is { state: "enrollment_required" } {
  return Boolean(value && typeof value === "object" && "state" in value && value.state === "enrollment_required");
}

export function isPasskeyEnrollmentRequiredError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { message?: unknown; data?: { code?: unknown } };
  return candidate.message === LEGACY_UNENROLLED_MESSAGE && candidate.data?.code === "UNAUTHORIZED";
}

export function isPasskeyEnrollmentReturnError(value: string | null): value is PasskeyEnrollmentReturnError {
  return value === "provider_email_mismatch" || value === "provider_verification_cancelled";
}

export function rememberPasskeyEnrollmentEmail(email: string): void {
  try { window.sessionStorage.setItem(EMAIL_KEY, email.trim().toLowerCase()); } catch { /* optional storage */ }
}

export function readPasskeyEnrollmentEmail(): string {
  try { return window.sessionStorage.getItem(EMAIL_KEY)?.trim().toLowerCase() ?? ""; } catch { return ""; }
}

export function clearPasskeyEnrollmentEmail(): void {
  try { window.sessionStorage.removeItem(EMAIL_KEY); } catch { /* optional storage */ }
}

export async function hashPasskeyEnrollmentEmail(email: string): Promise<string> {
  const bytes = new TextEncoder().encode(email.trim().toLowerCase());
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
