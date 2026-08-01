import crypto from "crypto";

export const PASSKEY_ENROLLMENT_INTENT = "enroll_passkey" as const;
export const PASSKEY_ENROLLMENT_SUCCESS_PATH = "/settings?passkey_enroll=1";
export const PASSKEY_ENROLLMENT_CANCEL_PATH = "/login?passkey_enroll=1&auth_error=provider_verification_cancelled";
export const PASSKEY_ENROLLMENT_MISMATCH_PATH = "/login?passkey_enroll=1&auth_error=provider_email_mismatch";

interface ProviderStatePayload {
  v: 1;
  csrf: string;
  issuedAt: number;
  intent?: typeof PASSKEY_ENROLLMENT_INTENT;
  expectedEmailHash?: string;
  humanProof?: string;
}

export type ProviderOAuthCallbackState =
  | { kind: "signed"; payload: ProviderStatePayload }
  | { kind: "legacy" };

function stateSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required to protect OAuth state");
  return secret;
}

function sign(encoded: string): string {
  return crypto.createHmac("sha256", stateSecret()).update(`getphame:provider-state:v1\0${encoded}`).digest("base64url");
}

export function isValidExpectedEmailHash(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

export function createProviderOAuthState(input?: {
  intent?: typeof PASSKEY_ENROLLMENT_INTENT;
  expectedEmailHash?: string;
  humanProof?: string;
}): string {
  const payload: ProviderStatePayload = {
    v: 1,
    csrf: crypto.randomBytes(16).toString("hex"),
    issuedAt: Date.now(),
    ...(input?.intent ? { intent: input.intent, expectedEmailHash: input.expectedEmailHash } : {}),
    ...(input?.humanProof ? { humanProof: input.humanProof } : {}),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyProviderOAuthState(value: unknown): ProviderStatePayload | null {
  if (typeof value !== "string") return null;
  const [encoded, signature, extra] = value.split(".");
  if (!encoded || !signature || extra) return null;
  const expected = sign(encoded);
  const providedBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (providedBytes.length !== expectedBytes.length || !crypto.timingSafeEqual(providedBytes, expectedBytes)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as ProviderStatePayload;
    if (payload.v !== 1 || !payload.csrf || !Number.isFinite(payload.issuedAt)) return null;
    if (Date.now() - payload.issuedAt > 10 * 60 * 1000 || payload.issuedAt > Date.now() + 60_000) return null;
    if (payload.intent && (payload.intent !== PASSKEY_ENROLLMENT_INTENT || !isValidExpectedEmailHash(payload.expectedEmailHash))) return null;
    if (payload.humanProof !== undefined && (typeof payload.humanProof !== "string" || payload.humanProof.length < 20 || payload.humanProof.length > 4096)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyProviderOAuthCallbackState(storedState: unknown, returnedState: unknown): ProviderOAuthCallbackState | null {
  if (typeof storedState !== "string" || typeof returnedState !== "string" || storedState !== returnedState) return null;
  const payload = verifyProviderOAuthState(returnedState);
  if (payload) return { kind: "signed", payload };

  // Pre-signed-state releases generated exactly 16 random bytes as lowercase hex.
  // Accept that historical shape only when the httpOnly cookie matches exactly;
  // malformed or tampered signed values must never downgrade to the legacy path.
  if (/^[a-f0-9]{32}$/.test(returnedState)) return { kind: "legacy" };
  return null;
}

export function providerEmailMatches(email: string, expectedHash: string): boolean {
  if (!isValidExpectedEmailHash(expectedHash)) return false;
  const actual = crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expectedHash, "hex"));
}
