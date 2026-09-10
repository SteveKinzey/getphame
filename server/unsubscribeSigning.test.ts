import crypto from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildUnsubToken, verifyUnsubToken } from "./routers";

const PRIMARY_SECRET =
  "unsubscribe-primary-key-with-more-than-thirty-two-characters";
const LEGACY_SECRET = "legacy-session-key-with-more-than-thirty-two-characters";

function buildLegacyToken(
  contactType: "contact" | "woo",
  id: number,
  userId: number
) {
  const payload = `${contactType}:${id}:${userId}`;
  const signature = crypto
    .createHmac("sha256", LEGACY_SECRET)
    .update(payload)
    .digest("hex")
    .slice(0, 16);
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

describe("unsubscribe signing-key separation", () => {
  beforeEach(() => {
    vi.stubEnv("UNSUBSCRIBE_SIGNING_SECRET", PRIMARY_SECRET);
    vi.stubEnv("JWT_SECRET", LEGACY_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("issues and verifies a full-length signature using the dedicated key", () => {
    const token = buildUnsubToken("contact", 17, 8);
    const raw = Buffer.from(token, "base64url").toString("utf8");
    expect(raw.split(":").at(-1)).toHaveLength(64);
    expect(verifyUnsubToken(token)).toEqual({
      contactType: "contact",
      id: 17,
      userId: 8,
    });
  });

  it("keeps new tokens valid when JWT_SECRET rotates", () => {
    const token = buildUnsubToken("woo", 19, 8);
    vi.stubEnv("JWT_SECRET", "a-completely-different-session-secret-value");
    expect(verifyUnsubToken(token)).toEqual({
      contactType: "woo",
      id: 19,
      userId: 8,
    });
  });

  it("temporarily verifies historical 16-character JWT signatures without issuing them", () => {
    const token = buildLegacyToken("contact", 21, 8);
    expect(verifyUnsubToken(token)).toEqual({
      contactType: "contact",
      id: 21,
      userId: 8,
    });
  });

  it("rejects tampering and refuses issuance without the dedicated key", () => {
    const token = buildUnsubToken("contact", 23, 8);
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const tampered = Buffer.from(
      raw.replace("contact:23:8", "contact:24:8")
    ).toString("base64url");
    expect(verifyUnsubToken(tampered)).toBeNull();

    vi.stubEnv("UNSUBSCRIBE_SIGNING_SECRET", "");
    expect(() => buildUnsubToken("contact", 23, 8)).toThrow(
      "UNSUBSCRIBE_SIGNING_SECRET"
    );
  });
});
